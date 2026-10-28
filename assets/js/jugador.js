// Lógica de la app del jugador (goles/index.html), usada con x-data="jugador()".
// Todo pasa por Store: en Django, Store se reemplaza por vistas y este archivo queda igual.
// Dispara 'cambio-horario' { fecha, hora } y escucha 'cancha-elegida' { canchaId } (del plano).
function jugador() {
  return {
    complejo: {},
    canchas: [],
    horas: [],           // horas de inicio de los turnos: 13..23
    dias: [],            // próximos 7 días, 'AAAA-MM-DD'
    libresPorDia: {},    // { 'AAAA-MM-DD': cantidad de turnos libres }
    fecha: null,
    turnos: [],          // [Turno] del día elegido, de las dos canchas
    filas: [],           // [{ hora, turnos: [Turno de cada cancha] }] para dibujar la grilla
    horaMirada: null,    // la hora que se avisa con 'cambio-horario'
    seleccion: null,     // { canchaId, desde, horas }: turnos seguidos de una misma cancha
    destacada: null,     // canchaId que se tocó en el plano
    cambiando: false,    // para la transición al cambiar de día
    usuario: null,       // sesión del ámbito 'jugador'
    despuesDelLogin: null, // 'resumen' | 'mis-reservas': adónde seguir cuando termine de entrar
    misReservas: [],     // reservas futuras del jugador, listas para mostrar
    paso: null,          // null (grilla) | 'resumen' | 'pago' | 'confirmada' | 'mis-reservas'
    pedido: null,        // foto de la selección al abrir el resumen
    pagando: false,
    reserva: null,       // la Reserva que devolvió el Store al pagar
    mensaje: '',
    temporizadorMensaje: null,

    init() {
      // En Django: complejo, canchas y usuario vienen del contexto de la vista del complejo
      this.complejo = Store.complejo();
      this.canchas = Store.canchas();
      this.usuario = Store.usuarioActual('jugador');
      const { desde, hasta } = this.complejo.horario;
      this.horas = Array.from({ length: hasta - desde }, (_, i) => desde + i);
      this.dias = Store.proximosDias(7);

      this.fecha = this.dias[0];
      this.actualizar();
      // Si hoy ya no queda ningún turno por jugar, arrancamos mostrando mañana
      if (!this.turnos.some((turno) => !turno.pasado)) {
        this.fecha = this.dias[1];
        this.actualizar();
      }
      this.horaMirada = this.primeraHoraDisponible();

      window.addEventListener('cancha-elegida', (evento) => this.alElegirCancha(evento.detail.canchaId));
      window.addEventListener('sesion-iniciada', (evento) => this.alIniciarSesion(evento.detail));
      // El plano llega con include.js: le avisamos el horario cuando ya está escuchando
      const avisarAlPlano = () => setTimeout(() => this.avisarHorario(), 0);
      if (window.componentesListos) avisarAlPlano();
      else window.addEventListener('componentes-listos', avisarAlPlano, { once: true });

      // Si entra una reserva (en esta pestaña o en otra) la grilla se repinta sola
      Store.alCambiar(({ tipo }) => {
        // Reiniciar la demo cierra las sesiones
        if (tipo === 'demo-reiniciada') this.usuario = Store.usuarioActual('jugador');
        this.actualizar();
      });
    },

    // ---------- Datos ----------

    actualizar() {
      // En Django: esto viene de la vista de turnos del día
      this.turnos = Store.turnosDelDia(this.fecha);
      this.filas = this.horas.map((hora) => ({
        hora,
        turnos: this.canchas.map((cancha) => this.turno(cancha.id, hora)),
      }));
      this.libresPorDia = Object.fromEntries(this.dias.map((dia) => [
        dia,
        Store.turnosDelDia(dia).filter((turno) => turno.estado === 'libre' && !turno.pasado).length,
      ]));
      this.cargarMisReservas();
      this.revisarSeleccion();
    },

    // En Django: esto viene de la vista "Mis reservas"
    cargarMisReservas() {
      if (!this.usuario) {
        this.misReservas = [];
        return;
      }
      this.misReservas = Store.reservasDeUsuario(this.usuario.telefono).map((reserva) => ({
        reserva,
        cancha: this.nombreCancha(reserva.canchaId),
        etiquetaDia: this.nombreDia(reserva.fecha, this.dias.indexOf(reserva.fecha)),
        numeroDia: this.numeroDia(reserva.fecha),
        dia: Fmt.diaLargo(reserva.fecha),
        rango: Fmt.rango(reserva.hora, reserva.horas),
        sena: reserva.senaPagada ? `Seña ${Fmt.pesos(reserva.sena)} pagada` : `Seña ${Fmt.pesos(reserva.sena)} pendiente`,
      }));
    },

    turno(canchaId, hora) {
      return this.turnos.find((turno) => turno.canchaId === canchaId && turno.hora === hora) || null;
    },

    disponible(turno) {
      return Boolean(turno) && turno.estado === 'libre' && !turno.pasado;
    },

    // Si alguien reservó lo que el jugador tenía elegido, se limpia la selección.
    // Con el resumen o el pago abiertos no: eso lo resuelve pagar()
    revisarSeleccion() {
      const s = this.seleccion;
      if (!s || this.paso) return;
      for (let hora = s.desde; hora < s.desde + s.horas; hora++) {
        if (!this.disponible(this.turno(s.canchaId, hora))) {
          this.seleccion = null;
          this.avisar('Alguien acaba de reservar ese horario. Elegí otro.');
          return;
        }
      }
    },

    primeraHoraDisponible() {
      const libre = this.turnos.find((turno) => this.disponible(turno));
      if (libre) return libre.hora;
      const porJugar = this.turnos.find((turno) => !turno.pasado);
      return porJugar ? porJugar.hora : null;
    },

    // ---------- Días ----------

    elegirDia(fecha) {
      if (fecha === this.fecha) return;
      this.cambiando = true;
      setTimeout(() => {
        this.fecha = fecha;
        this.seleccion = null;
        this.actualizar();
        // Se mantiene la hora que estaba mirando, si ese día todavía sirve
        const sigue = this.turnos.some((turno) => turno.hora === this.horaMirada && !turno.pasado);
        if (!sigue) this.horaMirada = this.primeraHoraDisponible();
        this.avisarHorario();
        this.cambiando = false;
      }, 150);
    },

    // 'Hoy', 'Mañana' y después el día de la semana ('Vie')
    nombreDia(fecha, indice) {
      if (indice === 0) return 'Hoy';
      if (indice === 1) return 'Mañana';
      return Fmt.dia(fecha).split(' ')[0];
    },

    numeroDia(fecha) {
      return Fmt.dia(fecha).split(' ')[1];
    },

    textoLibres(fecha) {
      const libres = this.libresPorDia[fecha] || 0;
      if (libres === 0) return 'Completo';
      return libres === 1 ? '1 libre' : `${libres} libres`;
    },

    // ---------- Turnos ----------

    // 'pasado' | 'elegido' | 'libre' | 'reservado' | 'fijo'
    estadoCelda(turno) {
      if (!turno || turno.pasado) return 'pasado';
      if (this.estaElegido(turno)) return 'elegido';
      return turno.estado;
    },

    textoCelda(turno) {
      const textos = { pasado: 'Ya pasó', elegido: 'Elegido', libre: 'Libre', reservado: 'Reservado', fijo: 'Fijo' };
      return textos[this.estadoCelda(turno)];
    },

    estaElegido(turno) {
      const s = this.seleccion;
      return Boolean(s) && turno.canchaId === s.canchaId && turno.hora >= s.desde && turno.hora < s.desde + s.horas;
    },

    // Tocar un libre lo elige. Tocar uno libre pegado a la selección (misma cancha) la estira.
    // Tocar una punta de la selección la achica. Cualquier otro arranca una selección nueva.
    tocar(turno) {
      this.horaMirada = turno.hora;
      this.avisarHorario();

      const estado = this.estadoCelda(turno);
      const cancha = this.nombreCancha(turno.canchaId);
      if (estado === 'pasado') return this.avisar('Ese horario ya pasó.');
      if (estado === 'reservado') return this.avisar(`La ${cancha} ya está reservada a las ${Fmt.hora(turno.hora)}.`);
      if (estado === 'fijo') return this.avisar(`Las ${Fmt.hora(turno.hora)} de la ${cancha} es un turno fijo.`);

      if (this.destacada && this.destacada !== turno.canchaId) this.destacada = turno.canchaId;

      const s = this.seleccion;
      const nueva = { canchaId: turno.canchaId, desde: turno.hora, horas: 1 };
      if (!s || s.canchaId !== turno.canchaId) {
        this.seleccion = nueva;
      } else if (estado === 'elegido') {
        if (s.horas === 1) this.seleccion = null;
        else if (turno.hora === s.desde) this.seleccion = { ...s, desde: s.desde + 1, horas: s.horas - 1 };
        else if (turno.hora === s.desde + s.horas - 1) this.seleccion = { ...s, horas: s.horas - 1 };
        else this.seleccion = nueva;
      } else if (turno.hora === s.desde - 1) {
        this.seleccion = { ...s, desde: s.desde - 1, horas: s.horas + 1 };
      } else if (turno.hora === s.desde + s.horas) {
        this.seleccion = { ...s, horas: s.horas + 1 };
      } else {
        this.seleccion = nueva;
      }
    },

    // ---------- Canchas ----------

    nombreCancha(canchaId) {
      const cancha = this.canchas.find((una) => una.id === canchaId);
      return cancha ? cancha.nombre : canchaId;
    },

    // Columna atenuada cuando se destacó la otra cancha
    atenuada(canchaId) {
      return this.destacada !== null && this.destacada !== canchaId;
    },

    alternarDestacada(canchaId) {
      this.destacada = this.destacada === canchaId ? null : canchaId;
    },

    // El plano avisa la cancha que tocó el jugador: se destaca y, si está libre, se elige ese turno
    alElegirCancha(canchaId) {
      this.destacada = canchaId;
      const turno = this.horaMirada === null ? null : this.turno(canchaId, this.horaMirada);
      if (this.disponible(turno) && !this.estaElegido(turno)) {
        this.seleccion = { canchaId, desde: turno.hora, horas: 1 };
      }
      this.$nextTick(() => {
        const destino = document.getElementById(`turno-${canchaId}-${this.horaMirada}`) || this.$refs.grilla;
        if (destino) destino.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    },

    // ---------- Resumen de la selección ----------
    // En Django: los montos los calcula la vista al armar la reserva

    get resumen() {
      const s = this.seleccion;
      if (!s) return null;
      const cancha = this.canchas.find((una) => una.id === s.canchaId);
      return {
        cancha: cancha.tipo, // corto, para que entre a 360 px
        dia: this.fecha === this.dias[0] ? 'Hoy' : Fmt.dia(this.fecha),
        rango: Fmt.rango(s.desde, s.horas),
        horas: s.horas === 1 ? '1 hora' : `${s.horas} horas`,
        total: Fmt.pesos(cancha.precioHora * s.horas),
        sena: Fmt.pesos(this.complejo.senaPorHora * s.horas),
      };
    },

    // ---------- Sesión ----------

    // "Reservar": con sesión va directo al resumen; sin sesión pide el celular (componente login-telefono)
    reservar() {
      if (!this.seleccion) return;
      if (this.usuario) return this.abrirResumen();
      this.pedirLogin('resumen');
    },

    // El ícono de arriba: con sesión abre "Mis reservas"; sin sesión pide el celular primero
    abrirMisReservas() {
      if (!this.usuario) return this.pedirLogin('mis-reservas');
      this.cargarMisReservas();
      this.paso = 'mis-reservas';
    },

    pedirLogin(despues) {
      this.despuesDelLogin = despues;
      window.dispatchEvent(new CustomEvent('pedir-login', { detail: { ambito: 'jugador' } }));
    },

    alIniciarSesion({ ambito, usuario }) {
      if (ambito !== 'jugador') return;
      this.usuario = usuario;
      this.cargarMisReservas();
      if (this.despuesDelLogin === 'resumen' && this.seleccion) this.abrirResumen();
      if (this.despuesDelLogin === 'mis-reservas') this.abrirMisReservas();
      this.despuesDelLogin = null;
    },

    salir() {
      // En Django: esto es el POST de logout
      Store.logout('jugador');
      this.usuario = null;
      this.misReservas = [];
      this.paso = null;
      this.avisar('Cerraste sesión. La próxima vez que reserves te pedimos el celular.');
    },

    get primerNombre() {
      return this.usuario ? this.usuario.nombre.split(' ')[0] : '';
    },

    // ---------- Resumen, pago y confirmación ----------

    // Se guarda una foto de la selección: si la grilla se repinta mientras paga, el pedido no cambia.
    // En Django: los montos los calcula la vista al armar la reserva
    abrirResumen() {
      const s = this.seleccion;
      const cancha = this.canchas.find((una) => una.id === s.canchaId);
      const total = cancha.precioHora * s.horas;
      const sena = this.complejo.senaPorHora * s.horas;
      this.pedido = {
        canchaId: s.canchaId,
        cancha: cancha.nombre,
        fecha: this.fecha,
        dia: Fmt.diaLargo(this.fecha),
        hora: s.desde,
        horas: s.horas,
        rango: Fmt.rango(s.desde, s.horas),
        cantidadHoras: s.horas === 1 ? '1 hora' : `${s.horas} horas`,
        total: Fmt.pesos(total),
        sena: Fmt.pesos(sena),
        senaPorHora: Fmt.pesos(this.complejo.senaPorHora),
        saldo: Fmt.pesos(total - sena),
      };
      this.paso = 'resumen';
    },

    irAPagar() {
      this.paso = 'pago';
    },

    cerrarPaso() {
      if (this.pagando) return;
      this.paso = this.paso === 'pago' ? 'resumen' : null;
      // Por si mientras miraba el resumen alguien reservó esos turnos
      if (!this.paso) this.revisarSeleccion();
    },

    // Mercado Pago simulado: un spinner de 2 segundos y después se guarda la reserva con la seña pagada
    pagar() {
      if (this.pagando) return;
      this.pagando = true;
      setTimeout(() => {
        const p = this.pedido;
        this.seleccion = null;
        // En Django: esto es el POST de la vista de reservas, cuando Mercado Pago confirma el pago
        const resultado = Store.reservar({
          canchaId: p.canchaId,
          fecha: p.fecha,
          hora: p.hora,
          horas: p.horas,
          nombre: this.usuario.nombre,
          telefono: this.usuario.telefono,
          origen: 'web',
          medioSena: 'mercadopago',
        });
        this.pagando = false;
        if (!resultado.ok) {
          this.paso = null;
          this.actualizar();
          this.avisar('¡Uy! Alguien reservó ese horario mientras pagabas. Tranqui, no se te cobró nada: elegí otro turno.', 6000);
          this.$nextTick(() => this.$refs.grilla.scrollIntoView({ behavior: 'smooth', block: 'start' }));
          return;
        }
        this.reserva = resultado.reserva;
        this.paso = 'confirmada';
      }, 2000);
    },

    volverATurnos() {
      this.paso = null;
      this.pedido = null;
      this.reserva = null;
      this.$nextTick(() => this.$refs.grilla.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    },

    // Archivo .ics generado en el navegador. Argentina es UTC-3 todo el año (sin horario de verano)
    descargarCalendario(r) {
      const cancha = this.canchas.find((una) => una.id === r.canchaId);
      const sena = Fmt.pesos(r.sena);
      const saldo = Fmt.pesos(cancha.precioHora * r.horas - (r.senaPagada ? r.sena : 0));
      const [anio, mes, dia] = r.fecha.split('-').map(Number);
      const enUtc = (hora) => new Date(Date.UTC(anio, mes - 1, dia, hora + 3)).toISOString().replace(/[-:]|\.\d{3}/g, '');
      const texto = (valor) => String(valor).replace(/\\/g, '\\\\').replace(/([,;])/g, '\\$1').replace(/\n/g, '\\n');
      const lineas = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Reservando//Demo//ES',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:${r.id}@reservando.com`,
        `DTSTAMP:${new Date().toISOString().replace(/[-:]|\.\d{3}/g, '')}`,
        `DTSTART:${enUtc(r.hora)}`,
        `DTEND:${enUtc(r.hora + r.horas)}`,
        `SUMMARY:${texto(`Fútbol en ${this.complejo.nombre} · ${cancha.nombre}`)}`,
        `LOCATION:${texto(this.complejo.direccion)}`,
        `DESCRIPTION:${texto(`${r.senaPagada ? `Seña pagada: ${sena}` : `Seña pendiente: ${sena}`}. A pagar en el complejo: ${saldo}.\nSin cancelación gratuita.`)}`,
        'BEGIN:VALARM',
        'TRIGGER:-PT2H',
        'ACTION:DISPLAY',
        `DESCRIPTION:${texto(`Hoy jugás en ${this.complejo.nombre}`)}`,
        'END:VALARM',
        'END:VEVENT',
        'END:VCALENDAR',
      ];
      const archivo = new Blob([lineas.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
      const enlace = document.createElement('a');
      enlace.href = URL.createObjectURL(archivo);
      enlace.download = `turno-${this.complejo.id}-${r.fecha}.ics`;
      document.body.append(enlace);
      enlace.click();
      enlace.remove();
      setTimeout(() => URL.revokeObjectURL(enlace.href), 1000);
    },

    get enlaceCompartir() {
      const p = this.pedido;
      if (!p) return '#';
      const dia = p.dia.charAt(0).toUpperCase() + p.dia.slice(1);
      const texto = [
        `⚽ ¡Tenemos cancha en ${this.complejo.nombre}!`,
        `${p.cancha} · ${dia}`,
        `⏰ ${p.rango}`,
        `📍 ${this.complejo.direccion}`,
        '',
        `Reservado con ${this.complejo.subdominio}`,
      ].join('\n');
      return `https://wa.me/?text=${encodeURIComponent(texto)}`;
    },

    // ---------- Encabezado ----------

    get enlaceWhatsapp() {
      const texto = `¡Hola ${this.complejo.nombre}! Quería consultar por un turno.`;
      return `https://wa.me/549${this.complejo.whatsapp}?text=${encodeURIComponent(texto)}`;
    },

    // ---------- Avisos ----------

    avisarHorario() {
      if (this.horaMirada === null) return;
      window.dispatchEvent(new CustomEvent('cambio-horario', { detail: { fecha: this.fecha, hora: this.horaMirada } }));
    },

    avisar(texto, duracion = 3200) {
      this.mensaje = texto;
      clearTimeout(this.temporizadorMensaje);
      this.temporizadorMensaje = setTimeout(() => { this.mensaje = ''; }, duracion);
    },
  };
}
