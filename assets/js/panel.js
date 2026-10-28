/* Panel del dueño de GOLES.
   Lógica de goles/panel.html, usada con x-data="panel()".
   Todo pasa por Store: en Django, Store se reemplaza por vistas y este archivo queda igual. */

const PANEL_MAX_HORAS_MANUAL = 4;

const PANEL_DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const PANEL_DIAS_PLURAL = ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados'];
// Orden de la semana para mostrar: de lunes a domingo.
const PANEL_SEMANA = [1, 2, 3, 4, 5, 6, 0];

const PANEL_ORIGENES = {
  web: { icono: 'smartphone', texto: 'Web' },
  manual: { icono: 'pencil-line', texto: 'Manual' },
  fijo: { icono: 'repeat', texto: 'Fijo' },
};

function panel() {
  return {
    usuario: null,
    complejo: {},
    canchas: [],
    horas: [],
    semana: PANEL_SEMANA,
    nombresDias: PANEL_DIAS,
    vista: 'agenda',
    fijos: [],
    formFijo: null,
    detalle: null,
    borrando: null,
    _timerBorrar: null,
    menu: false,
    config: false,
    confirmarReinicio: false,
    hoy: '',
    fecha: '',
    dias: [],
    columnas: [],
    resumen: { reservados: 0, total: 0, ocupacion: 0, libres: 0, porDelante: 0, senas: 0, senasMP: 0, senasEfectivo: 0 },
    horaActual: 0,
    resaltada: null,
    resaltadaHoy: false,
    aviso: null,
    form: null,
    logoOk: false,
    toque: null,
    _timerAviso: null,
    _timerResaltada: null,
    _audio: null,
    _titulo: document.title,

    init() {
      // En Django: complejo, canchas y usuario vienen del contexto de la vista del panel.
      this.complejo = Store.complejo() || {};
      this.canchas = Store.canchas();
      // Horas de inicio de los turnos: de 13 a 23 (el último termina a las 00)
      const horario = this.complejo.horario || { desde: 13, hasta: 24 };
      this.horas = Array.from({ length: horario.hasta - horario.desde }, (_, i) => horario.desde + i);
      this.logoOk = Boolean(this.complejo.logo);
      this.usuario = Store.usuarioActual('panel');
      this.hoy = Store.hoy();
      this.fecha = this.hoy;
      this.horaActual = horaArgentina();
      this.recargar();

      // En Django: esto se reemplaza por polling o websockets contra el servidor.
      Store.alCambiar((cambio) => this.alCambiarDatos(cambio));

      // El componente login-telefono avisa cuando el dueño terminó de entrar.
      window.addEventListener('sesion-iniciada', (e) => {
        if (e.detail.ambito !== 'panel') return;
        this.usuario = Store.usuarioActual('panel');
        this.recargar();
      });

      // El navegador solo deja sonar audio después de que el usuario tocó la página.
      window.addEventListener('pointerdown', () => this.prepararSonido(), { once: true });
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) document.title = this._titulo;
      });

      // Cada minuto actualiza "ahora" y, a la medianoche, pasa al día nuevo.
      setInterval(() => {
        const hoy = Store.hoy();
        if (hoy !== this.hoy) {
          if (this.fecha === this.hoy) this.fecha = hoy;
          this.hoy = hoy;
        }
        this.horaActual = horaArgentina();
        this.recargar();
      }, 60000);
    },

    // --- Sesión ---

    salir() {
      Store.logout('panel');
      this.usuario = null;
      this.cerrarModales();
      this.iconos();
      // Vuelve a mostrar el ingreso con teléfono
      window.dispatchEvent(new CustomEvent('pedir-login', { detail: { ambito: 'panel' } }));
    },

    cerrarModales() {
      this.form = null;
      this.formFijo = null;
      this.detalle = null;
      this.menu = false;
      this.config = false;
      this.confirmarReinicio = false;
    },

    get hayModal() {
      return Boolean(this.form || this.formFijo || this.detalle || this.config || this.confirmarReinicio);
    },

    // --- Menú ---

    abrirConfig() {
      this.menu = false;
      this.config = true;
      this.iconos();
    },

    irALoQueViene() {
      this.menu = false;
      const seccion = document.getElementById('lo-que-viene');
      if (seccion) seccion.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    pedirReinicio() {
      this.menu = false;
      this.confirmarReinicio = true;
      this.iconos();
    },

    // Vuelve a los datos de ejemplo. Si el reinicio cierra la sesión, el dueño vuelve a entrar
    // solo, así la presentación no se corta.
    reiniciarDemo() {
      const usuario = this.usuario;
      Store.reiniciarDemo();
      if (usuario && !Store.usuarioActual('panel')) {
        this.usuario = Store.login(usuario.telefono, usuario.nombre, 'panel');
      }
      this.cerrarModales();
      this.vista = 'agenda';
      this.fecha = this.hoy;
      this.recargar();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.mostrarAviso({ tipo: 'ok', titulo: 'Demo reiniciada', texto: 'Volvieron las reservas de ejemplo y los turnos fijos quedaron vacíos.' });
    },

    // --- Configuración (solo vista) ---
    // En Django: estos valores vienen del modelo del complejo y se podrán editar.

    get horarioTexto() {
      return Fmt.hora(this.horas[0]) + ' a ' + Fmt.hora(this.horas[this.horas.length - 1] + 1);
    },

    get duracionTexto() {
      const horas = this.complejo.duracionTurno || 1;
      return horas === 1 ? '1 hora' : horas + ' horas';
    },

    get senaPorHora() {
      return this.complejo.senaPorHora || 0;
    },

    get comisionDelComplejo() {
      return this.complejo.comisionMercadoPago === 'complejo';
    },

    // Alto de cada fila de la agenda, una por hora
    get filasAgenda() {
      return 'grid-template-rows: repeat(' + this.horas.length + ', 5.75rem)';
    },

    // --- Datos ---

    recargar() {
      this.dias = Store.proximosDias(14);
      this.columnas = this.canchas.map((cancha) => this.armarColumna(cancha));
      this.resumen = this.calcularResumen();
      // En Django: esto viene de la vista de turnos fijos del panel.
      this.fijos = Store.turnosFijos();
      this.refrescarDetalle();
      this.iconos();
    },

    // Bloques de una cancha para el día elegido: una reserva de varias horas es un solo bloque.
    armarColumna(cancha) {
      // En Django: esto viene de la vista de agenda del panel.
      const turnos = Store.turnosDelDia(this.fecha, cancha.id);
      const reservas = Store.reservasDelDia(this.fecha).filter((r) => r.canchaId === cancha.id);
      const ultima = this.horas[this.horas.length - 1];
      const bloques = [];

      for (let h = this.horas[0]; h <= ultima; ) {
        const r = reservas.find((x) => x.hora === h);
        if (r) {
          const horas = Math.max(1, Math.min(r.horas || 1, ultima + 1 - h));
          bloques.push({
            key: [cancha.id, h, r.id, r.senaPagada, r.medioSena, r.asistencia].join('-'),
            tipo: r.origen === 'fijo' ? 'fijo' : 'reserva',
            hora: h,
            horas,
            reserva: r,
            sena: estadoSena(r),
            origen: PANEL_ORIGENES[r.origen] || PANEL_ORIGENES.web,
            pasado: this.esPasado(h + horas),
          });
          h += horas;
        } else {
          const turno = turnos.find((t) => t.hora === h) || {};
          bloques.push({
            key: cancha.id + '-' + h + '-libre',
            tipo: 'libre',
            hora: h,
            horas: 1,
            precio: turno.precio || cancha.precioHora,
            pasado: this.esPasado(h + 1),
          });
          h += 1;
        }
      }

      return {
        cancha,
        bloques,
        total: turnos.length,
        ocupados: turnos.filter((t) => t.estado !== 'libre').length,
      };
    },

    // El resumen es siempre de hoy, aunque la agenda muestre otro día.
    calcularResumen() {
      const turnos = this.canchas.flatMap((c) => Store.turnosDelDia(this.hoy, c.id));
      const libres = turnos.filter((t) => t.estado === 'libre');
      const reservados = turnos.length - libres.length;
      const pagadas = Store.reservasDelDia(this.hoy).filter((r) => r.senaPagada);
      const suma = (lista) => lista.reduce((total, r) => total + (r.sena || 0), 0);

      return {
        reservados,
        total: turnos.length,
        ocupacion: turnos.length ? Math.round((reservados * 100) / turnos.length) : 0,
        libres: libres.length,
        porDelante: libres.filter((t) => t.hora >= this.horaActual).length,
        senas: suma(pagadas),
        senasMP: suma(pagadas.filter((r) => r.medioSena === 'mercadopago')),
        senasEfectivo: suma(pagadas.filter((r) => r.medioSena === 'efectivo')),
      };
    },

    // --- En vivo ---

    alCambiarDatos({ tipo, datos }) {
      if (tipo === 'demo-reiniciada') {
        // Aunque se reinicie desde otra pestaña, el dueño sigue adentro del panel.
        const antes = this.usuario;
        this.usuario = Store.usuarioActual('panel');
        if (antes && !this.usuario) this.usuario = Store.login(antes.telefono, antes.nombre, 'panel');
        this.cerrarModales();
        this.fecha = this.hoy;
      }

      const reserva = tipo === 'reserva-nueva' ? (datos && (datos.reserva || datos)) || {} : null;
      const deJugador = reserva && reserva.origen !== 'manual' && this.usuario;

      // Si la reserva del jugador es de otro día, la agenda salta a ese día para que se vea.
      if (deJugador) this.vista = 'agenda';
      if (deJugador && reserva.fecha && reserva.fecha !== this.fecha) this.fecha = reserva.fecha;
      this.recargar();

      if (reserva && this.usuario) this.resaltar(reserva);
      if (deJugador) this.anunciar(reserva);
    },

    resaltar(reserva) {
      clearTimeout(this._timerResaltada);
      this.resaltada = reserva.id;
      this.resaltadaHoy = reserva.fecha === this.hoy;
      this._timerResaltada = setTimeout(() => {
        this.resaltada = null;
        this.resaltadaHoy = false;
      }, 8000);
    },

    // El momento fuerte de la demo: aviso, destello, sonido y la agenda va hasta el turno.
    anunciar(r) {
      const cancha = this.canchas.find((c) => c.id === r.canchaId) || {};
      const nombre = (r.nombre || 'un jugador').trim().split(' ')[0];
      const cuando = r.fecha === this.hoy ? 'Hoy' : Fmt.dia(r.fecha);
      const sena = r.senaPagada ? 'seña ' + Fmt.pesos(r.sena) + ' pagada' : 'seña pendiente';

      this.mostrarAviso({
        tipo: 'nueva',
        titulo: 'Nueva reserva de ' + nombre + ' — ' + (cancha.tipo || cancha.nombre || '') + ', ' + r.hora + ' hs',
        texto: cuando + ' · ' + Fmt.rango(r.hora, r.horas || 1) + ' · ' + sena,
      });
      this.sonar();
      if (navigator.vibrate) navigator.vibrate([80, 60, 80]);
      if (document.hidden) document.title = '● Nueva reserva · ' + this._titulo;

      this.$nextTick(() => {
        const bloque = document.querySelector('[data-reserva="' + r.id + '"]');
        if (bloque) bloque.scrollIntoView({ block: 'center', behavior: 'smooth' });
      });
    },

    mostrarAviso(aviso) {
      clearTimeout(this._timerAviso);
      this.aviso = Object.assign({ id: Date.now() }, aviso);
      this.iconos();
      this._timerAviso = setTimeout(() => (this.aviso = null), 6500);
    },

    prepararSonido() {
      try {
        this._audio = this._audio || new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        this._audio = null;
      }
    },

    // Dos notas cortas, tipo notificación.
    sonar() {
      const ctx = this._audio;
      if (!ctx) return;
      try {
        if (ctx.state === 'suspended') ctx.resume();
        [880, 1318.5].forEach((frecuencia, i) => {
          const osc = ctx.createOscillator();
          const vol = ctx.createGain();
          const inicio = ctx.currentTime + i * 0.13;
          osc.type = 'sine';
          osc.frequency.value = frecuencia;
          vol.gain.setValueAtTime(0.0001, inicio);
          vol.gain.exponentialRampToValueAtTime(0.18, inicio + 0.02);
          vol.gain.exponentialRampToValueAtTime(0.0001, inicio + 0.35);
          osc.connect(vol).connect(ctx.destination);
          osc.start(inicio);
          osc.stop(inicio + 0.4);
        });
      } catch (e) { /* sin sonido no pasa nada */ }
    },

    // --- Reserva manual ---

    // Se abre al tocar un hueco libre. Deja elegir cuántas horas seguidas, hasta el próximo turno ocupado.
    abrirManual(col, indice) {
      const bloque = col.bloques[indice];
      if (bloque.pasado) return;

      let seguidas = 0;
      for (const b of col.bloques.slice(indice)) {
        if (b.tipo !== 'libre') break;
        seguidas += 1;
      }

      this.form = {
        cancha: col.cancha,
        fecha: this.fecha,
        hora: bloque.hora,
        horas: 1,
        maxHoras: Math.min(seguidas, PANEL_MAX_HORAS_MANUAL),
        precio: bloque.precio || 0,
        nombre: '',
        telefono: '',
        senaEfectivo: false,
        error: '',
      };
      this.iconos();
      this.$nextTick(() => this.$refs.nombreManual && this.$refs.nombreManual.focus());
    },

    cerrarManual() {
      this.form = null;
    },

    // En Django: la seña por hora viene de la configuración del complejo.
    get senaManual() {
      return this.form ? this.senaPorHora * this.form.horas : 0;
    },

    guardarManual() {
      const f = this.form;
      const nombre = f.nombre.trim();
      const telefono = Store.normalizarTelefono(f.telefono);

      if (!nombre) {
        f.error = 'Poné el nombre de quien reserva.';
        return;
      }
      if (!telefono) {
        f.error = 'Revisá el teléfono: va con código de área, sin 0 ni 15.';
        return;
      }

      // En Django: POST a la vista de reserva manual del panel.
      const resultado = Store.reservar({
        canchaId: f.cancha.id,
        fecha: f.fecha,
        hora: f.hora,
        horas: f.horas,
        nombre,
        telefono,
        origen: 'manual',
        medioSena: f.senaEfectivo ? 'efectivo' : null,
      });

      if (!resultado.ok) {
        f.error = resultado.error || 'No se pudo guardar la reserva.';
        return;
      }

      this.form = null;
      this.resaltar(resultado.reserva);
      this.mostrarAviso({
        tipo: 'ok',
        titulo: 'Reserva guardada',
        texto: nombre + ' · ' + (f.cancha.tipo || f.cancha.nombre) + ' · ' + Fmt.dia(f.fecha) + ' ' + Fmt.rango(f.hora, f.horas),
      });
    },

    // --- Detalle de una reserva: asistencia y seña ---

    abrirDetalle(col, bloque) {
      this.detalle = {
        reserva: bloque.reserva,
        cancha: col.cancha,
        horas: bloque.horas,
        sena: bloque.sena,
        origen: bloque.origen,
      };
      this.iconos();
    },

    // Después de cada cambio, el detalle abierto se vuelve a leer del Store.
    refrescarDetalle() {
      if (!this.detalle) return;
      const id = this.detalle.reserva.id;
      for (const col of this.columnas) {
        const bloque = col.bloques.find((b) => b.reserva && b.reserva.id === id);
        if (bloque) {
          this.detalle = { reserva: bloque.reserva, cancha: col.cancha, horas: bloque.horas, sena: bloque.sena, origen: bloque.origen };
          return;
        }
      }
      this.detalle = null;
    },

    // Tocar de nuevo la opción marcada la deshace.
    // En Django: POST a la vista de asistencia.
    marcarAsistencia(estado) {
      const r = this.detalle.reserva;
      Store.marcarAsistencia(r.id, r.asistencia === estado ? null : estado);
      this.recargar();
    },

    // En Django: POST a la vista que registra la seña en efectivo.
    cobrarSenaEfectivo() {
      const r = this.detalle.reserva;
      Store.marcarSenaEfectivo(r.id);
      this.recargar();
      this.mostrarAviso({ tipo: 'ok', titulo: 'Seña cobrada en efectivo', texto: r.nombre + (r.sena ? ' · ' + Fmt.pesos(r.sena) : '') });
    },

    // --- Turnos fijos ---

    // Agrupados por día de la semana, de lunes a domingo.
    get fijosPorDia() {
      return PANEL_SEMANA
        .map((dia) => ({
          dia,
          nombre: PANEL_DIAS[dia],
          fijos: this.fijos
            .filter((f) => f.diaSemana === dia)
            .sort((a, b) => a.hora - b.hora || String(a.canchaId).localeCompare(String(b.canchaId))),
        }))
        .filter((grupo) => grupo.fijos.length);
    },

    abrirFijo() {
      this.formFijo = {
        canchaId: this.canchas.length ? this.canchas[0].id : '',
        diaSemana: new Date(this.fecha + 'T12:00:00Z').getUTCDay(),
        hora: 21,
        horas: 1,
        responsable: '',
        telefono: '',
        error: '',
      };
      this.iconos();
    },

    elegirHoraFijo(hora) {
      this.formFijo.hora = hora;
      this.formFijo.horas = Math.min(this.formFijo.horas, 24 - hora);
    },

    get maxHorasFijo() {
      return this.formFijo ? Math.min(PANEL_MAX_HORAS_MANUAL, 24 - this.formFijo.hora) : 1;
    },

    guardarFijo() {
      const f = this.formFijo;
      const responsable = f.responsable.trim();
      const telefono = Store.normalizarTelefono(f.telefono);

      if (!responsable) {
        f.error = 'Poné el nombre del responsable del turno.';
        return;
      }
      if (!telefono) {
        f.error = 'Revisá el teléfono: va con código de área, sin 0 ni 15.';
        return;
      }

      // En Django: POST a la vista de turnos fijos.
      const resultado = Store.crearTurnoFijo({
        canchaId: f.canchaId,
        diaSemana: f.diaSemana,
        hora: f.hora,
        horas: f.horas,
        responsable,
        telefono,
      });

      if (!resultado.ok) {
        f.error = resultado.error || 'No se pudo guardar el turno fijo.';
        return;
      }

      this.formFijo = null;
      this.recargar();
      this.mostrarAviso({ tipo: 'ok', titulo: 'Turno fijo guardado', texto: this.textoFijo(resultado.turnoFijo || f) });
    },

    // Borrar pide confirmación: el primer toque arma el botón y el segundo borra.
    borrarFijo(fijo) {
      if (this.borrando !== fijo.id) {
        clearTimeout(this._timerBorrar);
        this.borrando = fijo.id;
        this._timerBorrar = setTimeout(() => (this.borrando = null), 4000);
        return;
      }
      clearTimeout(this._timerBorrar);
      this.borrando = null;
      // En Django: POST a la vista que borra el turno fijo.
      Store.borrarTurnoFijo(fijo.id);
      this.recargar();
      this.mostrarAviso({ tipo: 'ok', titulo: 'Turno fijo borrado', texto: fijo.responsable + ' · ' + this.textoFijo(fijo) });
    },

    nombreCancha(canchaId) {
      const cancha = this.canchas.find((c) => c.id === canchaId) || {};
      return cancha.tipo || cancha.nombre || canchaId;
    },

    textoFijo(f) {
      return this.nombreCancha(f.canchaId) + ' · Todos los ' + PANEL_DIAS_PLURAL[f.diaSemana] + ' · ' + Fmt.rango(f.hora, f.horas);
    },

    // --- Navegación de días ---

    moverDia(n) {
      this.irA(sumarDias(this.fecha, n));
    },

    irA(fecha) {
      this.fecha = fecha;
      this.recargar();
      this.$nextTick(() => {
        const chip = document.querySelector('[data-dia-activo]');
        if (chip) chip.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
      });
    },

    // Deslizar la agenda a los costados cambia de día (en el celular).
    // La tira de días tiene su propio scroll horizontal, así que ahí no cuenta.
    tocarInicio(e) {
      if (e.target.closest('[data-sin-deslizar]')) {
        this.toque = null;
        return;
      }
      const t = e.changedTouches[0];
      this.toque = { x: t.clientX, y: t.clientY };
    },

    tocarFin(e) {
      if (!this.toque || this.vista !== 'agenda') return;
      const t = e.changedTouches[0];
      const dx = t.clientX - this.toque.x;
      const dy = t.clientY - this.toque.y;
      this.toque = null;
      if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) this.moverDia(dx < 0 ? 1 : -1);
    },

    // --- Ayudas de presentación ---

    get logo() {
      const logo = this.complejo.logo || '';
      return /^(https?:|data:|\/|\.\.\/)/.test(logo) ? logo : '../' + logo;
    },

    get iniciales() {
      return (this.complejo.nombre || 'GOLES').slice(0, 2).toUpperCase();
    },

    get primerNombre() {
      return ((this.usuario && this.usuario.nombre) || 'Dueño').split(' ')[0];
    },

    get etiquetaDia() {
      if (this.fecha === this.hoy) return 'Hoy';
      if (this.fecha === sumarDias(this.hoy, 1)) return 'Mañana';
      if (this.fecha === sumarDias(this.hoy, -1)) return 'Ayer';
      return 'Agenda';
    },

    esPasado(horaFin) {
      return this.fecha < this.hoy || (this.fecha === this.hoy && horaFin <= this.horaActual);
    },

    claseHora(h) {
      if (this.fecha === this.hoy && h === this.horaActual) return 'bg-club text-white shadow-sm';
      if (this.esPasado(h + 1)) return 'text-marca-oscuro/25';
      return 'text-marca-oscuro/55';
    },

    iconos() {
      this.$nextTick(() => window.lucide && lucide.createIcons());
    },
  };
}

function estadoSena(r) {
  if (r.senaPagada && r.medioSena === 'efectivo') {
    return { icono: 'banknote', corto: 'Efectivo', largo: 'Seña en efectivo', clase: 'bg-libre text-white' };
  }
  if (r.senaPagada) {
    return { icono: 'circle-check', corto: 'Seña MP', largo: 'Seña por Mercado Pago', clase: 'bg-libre text-white' };
  }
  if (r.origen === 'fijo') {
    return { icono: 'clock', corto: 'En cancha', largo: 'Paga en la cancha', clase: 'bg-marca-oscuro/10 text-marca-oscuro/75' };
  }
  return { icono: 'clock', corto: 'Pendiente', largo: 'Seña pendiente', clase: 'bg-alerta text-white' };
}

// Suma días a una fecha 'AAAA-MM-DD' sin problemas de zona horaria.
function sumarDias(fecha, n) {
  const d = new Date(fecha + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function horaArgentina() {
  return Number(new Intl.DateTimeFormat('es-AR', {
    hour: 'numeric',
    hourCycle: 'h23',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(new Date()));
}
