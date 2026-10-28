// Store: la ÚNICA puerta a los datos de la demo.
// Ninguna pantalla lee ni escribe localStorage por su cuenta: todo pasa por acá.
// Todo se guarda con el prefijo 'reservando:'.
// En Django: este archivo se reemplaza por llamadas a las vistas y las pantallas quedan iguales.
const Store = (() => {
  const PREFIJO = 'reservando:';
  const CLAVES = {
    reservas: 'reservas',
    fijos: 'fijos',
    marcasFijos: 'marcas-fijos', // asistencia y seña de cada día de un turno fijo
    codigos: 'codigos',          // códigos simulados enviados por "WhatsApp"
    semilla: 'semilla',          // fecha en que se generaron las reservas de ejemplo
    evento: 'evento',            // último cambio, para avisar a otras pestañas e iframes
    sesion: (ambito) => `sesion:${ambito}`,
  };
  const ZONA_HORARIA = 'America/Argentina/Buenos_Aires';
  const DESDE = GOLES.horario.desde; // 13
  const HASTA = GOLES.horario.hasta; // 24: el último turno es de 23 a 00
  const AMBITOS = ['jugador', 'panel'];
  const ORIGENES = ['web', 'manual'];
  const MEDIOS_SENA = ['mercadopago', 'efectivo'];
  const oyentes = [];

  // ---------- localStorage ----------

  function leer(clave, porDefecto) {
    try {
      const texto = localStorage.getItem(PREFIJO + clave);
      return texto === null ? porDefecto : JSON.parse(texto);
    } catch (error) {
      return porDefecto;
    }
  }

  function guardar(clave, valor) {
    try {
      localStorage.setItem(PREFIJO + clave, JSON.stringify(valor));
    } catch (error) {
      console.warn('Store: no se pudo guardar', clave, error);
    }
  }

  function borrar(clave) {
    try {
      localStorage.removeItem(PREFIJO + clave);
    } catch (error) { /* sin localStorage no hay nada que borrar */ }
  }

  // ---------- Ayudas ----------

  const fallo = (error) => ({ ok: false, error });
  const nuevoId = (prefijo) => `${prefijo}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const copia = (valor) => JSON.parse(JSON.stringify(valor));
  const buscarCancha = (canchaId) => GOLES.canchas.find((cancha) => cancha.id === canchaId);
  const senaDe = (horas) => GOLES.senaPorHora * horas;
  const seSuperponen = (a, b) => a.hora < b.hora + b.horas && b.hora < a.hora + a.horas;

  // Fecha y hora actuales en Argentina, sea cual sea la zona del navegador
  function ahora() {
    const partes = {};
    new Intl.DateTimeFormat('en-CA', {
      timeZone: ZONA_HORARIA, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date()).forEach(({ type, value }) => { partes[type] = value; });
    return { fecha: `${partes.year}-${partes.month}-${partes.day}`, hora: Number(partes.hour) % 24 };
  }

  function sumarDias(fecha, dias) {
    const [anio, mes, dia] = fecha.split('-').map(Number);
    return new Date(Date.UTC(anio, mes - 1, dia + dias)).toISOString().slice(0, 10);
  }

  function diaDeLaSemana(fecha) {
    const [anio, mes, dia] = fecha.split('-').map(Number);
    return new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay(); // 0 = domingo
  }

  function fechaValida(fecha) {
    return typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha) && sumarDias(fecha, 0) === fecha;
  }

  // Un turno "ya pasó" cuando su hora de inicio ya llegó
  function yaEmpezo(fecha, hora, momento = ahora()) {
    return fecha < momento.fecha || (fecha === momento.fecha && hora <= momento.hora);
  }

  // Acepta '+54 9 11 2345-6789', '011 15 2345-6789', '11 2345 6789'... → '1123456789' | null
  function normalizarTelefono(texto) {
    let digitos = String(texto || '').replace(/\D/g, '');
    if (digitos.length > 10 && digitos.startsWith('54')) digitos = digitos.slice(2); // código de país
    if (digitos.length === 11 && digitos.startsWith('9')) digitos = digitos.slice(1); // 9 de celulares
    if (digitos.startsWith('0')) digitos = digitos.slice(1);                           // 0 de larga distancia
    if (digitos.length === 12) {                                                       // 15 después del área
      const largoArea = [2, 3, 4].find((largo) => digitos.substr(largo, 2) === '15');
      if (largoArea) digitos = digitos.slice(0, largoArea) + digitos.slice(largoArea + 2);
    }
    return /^[1-3]\d{9}$/.test(digitos) ? digitos : null;
  }

  // ---------- Datos guardados ----------

  // Las reservas de ejemplo se generan relativas a hoy. Si la demo se abre otro día,
  // se regeneran solas sin tocar las reservas reales ni los turnos fijos.
  function sembrarSiHaceFalta() {
    const hoy = ahora().fecha;
    if (leer(CLAVES.semilla, null) === hoy) return;
    const reservas = leer(CLAVES.reservas, []).filter((reserva) => !reserva.ejemplo);
    const fijos = leer(CLAVES.fijos, []);
    RESERVAS_EJEMPLO.forEach((ejemplo) => {
      const fecha = sumarDias(hoy, ejemplo.dia);
      const pisa = ocupacionDelDia(reservas, fijos, fecha)
        .some((otra) => otra.canchaId === ejemplo.canchaId && seSuperponen(otra, ejemplo));
      if (pisa) return;
      reservas.push({
        id: nuevoId('r'),
        canchaId: ejemplo.canchaId,
        fecha,
        hora: ejemplo.hora,
        horas: ejemplo.horas,
        nombre: ejemplo.nombre,
        telefono: ejemplo.telefono,
        origen: ejemplo.origen,
        sena: senaDe(ejemplo.horas),
        senaPagada: ejemplo.medioSena !== null,
        medioSena: ejemplo.medioSena,
        asistencia: null,
        creadaEn: new Date().toISOString(),
        ejemplo: true,
      });
    });
    guardar(CLAVES.reservas, reservas);
    guardar(CLAVES.semilla, hoy);
  }

  function reservasGuardadas() {
    sembrarSiHaceFalta();
    return leer(CLAVES.reservas, []);
  }

  function fijosGuardados() {
    return leer(CLAVES.fijos, []);
  }

  // Los turnos fijos valen todas las semanas a partir del día en que se cargan
  function fijosDelDia(fijos, fecha) {
    const diaSemana = diaDeLaSemana(fecha);
    return fijos.filter((fijo) => fijo.diaSemana === diaSemana && fecha >= fijo.desde);
  }

  // Lo que ocupa cada cancha ese día: reservas y turnos fijos
  function ocupacionDelDia(reservas, fijos, fecha) {
    return reservas.filter((reserva) => reserva.fecha === fecha).concat(fijosDelDia(fijos, fecha));
  }

  // Un turno fijo, en un día puntual, se muestra como una Reserva con origen 'fijo'
  function reservaDeFijo(fijo, fecha, marcas = leer(CLAVES.marcasFijos, {})) {
    const id = `fijo-${fijo.id}-${fecha}`;
    const marca = marcas[id] || {};
    return {
      id,
      canchaId: fijo.canchaId,
      fecha,
      hora: fijo.hora,
      horas: fijo.horas,
      nombre: fijo.responsable,
      telefono: fijo.telefono,
      origen: 'fijo',
      sena: senaDe(fijo.horas),
      senaPagada: Boolean(marca.medioSena),
      medioSena: marca.medioSena || null,
      asistencia: marca.asistencia || null,
      creadaEn: fijo.creadoEn,
      turnoFijoId: fijo.id,
    };
  }

  // 'fijo-<idDelFijo>-AAAA-MM-DD' → Reserva del fijo ese día, o null
  function buscarReservaDeFijo(reservaId) {
    const fecha = reservaId.slice(-10);
    const fijoId = reservaId.slice(5, -11);
    if (!fechaValida(fecha)) return null;
    const fijo = fijosDelDia(fijosGuardados(), fecha).find((uno) => uno.id === fijoId);
    return fijo ? reservaDeFijo(fijo, fecha) : null;
  }

  // Una reserva guardada o un día de un turno fijo → Reserva | null
  function buscarReserva(reservaId) {
    const id = String(reservaId || '');
    if (id.startsWith('fijo-')) return buscarReservaDeFijo(id);
    return reservasGuardadas().find((reserva) => reserva.id === id) || null;
  }

  // Cambia una reserva (o un día de un turno fijo) y avisa
  function actualizarReserva(reservaId, cambios) {
    const id = String(reservaId || '');
    if (id.startsWith('fijo-')) {
      if (!buscarReservaDeFijo(id)) return fallo('No encontramos ese turno.');
      const marcas = leer(CLAVES.marcasFijos, {});
      marcas[id] = Object.assign({}, marcas[id], cambios);
      guardar(CLAVES.marcasFijos, marcas);
      const reserva = buscarReservaDeFijo(id);
      avisar('reserva-actualizada', reserva);
      return { ok: true, reserva };
    }
    const reservas = reservasGuardadas();
    const reserva = reservas.find((una) => una.id === id);
    if (!reserva) return fallo('No encontramos esa reserva.');
    Object.assign(reserva, cambios);
    guardar(CLAVES.reservas, reservas);
    avisar('reserva-actualizada', reserva);
    return { ok: true, reserva };
  }

  // ---------- Cambios en vivo ----------

  function avisar(tipo, datos) {
    // Escribir esta clave dispara el evento 'storage' en las otras pestañas e iframes
    guardar(CLAVES.evento, { tipo, datos, id: nuevoId('e') });
    notificar({ tipo, datos });
  }

  function notificar(cambio) {
    oyentes.slice().forEach((callback) => {
      try {
        callback(cambio);
      } catch (error) {
        console.error('Store.alCambiar: error en un callback', error);
      }
    });
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (evento) => {
      if (evento.key !== PREFIJO + CLAVES.evento || !evento.newValue) return;
      try {
        const { tipo, datos } = JSON.parse(evento.newValue);
        notificar({ tipo, datos });
      } catch (error) { /* evento con formato desconocido */ }
    });
  }

  // ---------- API pública ----------

  const api = {
    // ----- Complejo y canchas -----

    // En Django: esto viene de la vista del complejo
    complejo() {
      return copia(GOLES);
    },

    canchas() {
      return copia(GOLES.canchas);
    },

    // ----- Fechas (hora de Argentina) -----

    hoy() {
      return ahora().fecha;
    },

    proximosDias(n = 7) {
      const hoy = ahora().fecha;
      return Array.from({ length: n }, (_, i) => sumarDias(hoy, i));
    },

    // ----- Turnos y reservas -----

    // [Turno] de 13 a 23 (el de 23 termina a las 00), por cancha y por hora.
    // Además del contrato trae 'pasado': true si la hora de inicio ya llegó.
    // En Django: esto viene de la vista de turnos del día
    turnosDelDia(fecha, canchaId) {
      if (!fechaValida(fecha)) return [];
      const momento = ahora();
      const canchas = canchaId ? GOLES.canchas.filter((cancha) => cancha.id === canchaId) : GOLES.canchas;
      const ocupadas = api.reservasDelDia(fecha);
      const turnos = [];
      canchas.forEach((cancha) => {
        for (let hora = DESDE; hora < HASTA; hora++) {
          const reserva = ocupadas.find((una) => una.canchaId === cancha.id && hora >= una.hora && hora < una.hora + una.horas);
          turnos.push({
            canchaId: cancha.id,
            fecha,
            hora,
            estado: !reserva ? 'libre' : reserva.origen === 'fijo' ? 'fijo' : 'reservado',
            precio: cancha.precioHora,
            reservaId: reserva ? reserva.id : null,
            pasado: yaEmpezo(fecha, hora, momento),
          });
        }
      });
      return turnos;
    },

    // datos = { canchaId, fecha, hora, horas = 1, nombre, telefono, origen = 'web', medioSena? }
    // Desde la web la seña se da por pagada con Mercado Pago, salvo que se pase otro medioSena (o null).
    // En Django: esto es el POST de la vista de reservas
    reservar(datos = {}) {
      const cancha = buscarCancha(datos.canchaId);
      if (!cancha) return fallo('Esa cancha no existe.');
      if (!fechaValida(datos.fecha)) return fallo('La fecha no es válida.');
      const hora = Number(datos.hora);
      const horas = Number(datos.horas === undefined ? 1 : datos.horas);
      if (!Number.isInteger(hora) || !Number.isInteger(horas) || horas < 1) return fallo('El turno no es válido.');
      if (hora < DESDE || hora + horas > HASTA) {
        return fallo(`Los turnos son de ${Fmt.hora(DESDE)} a ${Fmt.hora(HASTA)}.`);
      }

      const origen = datos.origen === undefined ? 'web' : datos.origen;
      if (!ORIGENES.includes(origen)) return fallo('El origen de la reserva no es válido.');
      // Desde la web no se reserva un turno que ya empezó; el dueño sí puede cargar el que está en curso
      const momento = ahora();
      const empezo = origen === 'manual'
        ? datos.fecha < momento.fecha || (datos.fecha === momento.fecha && hora < momento.hora)
        : yaEmpezo(datos.fecha, hora, momento);
      if (empezo) return fallo('Ese horario ya pasó.');

      const nombre = String(datos.nombre || '').trim();
      if (!nombre) return fallo('Falta el nombre.');
      const telefono = normalizarTelefono(datos.telefono);
      if (!telefono) return fallo('El teléfono no es válido.');

      const medioSena = 'medioSena' in datos ? datos.medioSena : (origen === 'web' ? 'mercadopago' : null);
      if (medioSena !== null && !MEDIOS_SENA.includes(medioSena)) return fallo('El medio de pago de la seña no es válido.');

      const choque = api.reservasDelDia(datos.fecha)
        .find((otra) => otra.canchaId === cancha.id && seSuperponen(otra, { hora, horas }));
      if (choque) return fallo(`Ese horario ya está ocupado (${Fmt.rango(choque.hora, choque.horas)}).`);

      const reserva = {
        id: nuevoId('r'),
        canchaId: cancha.id,
        fecha: datos.fecha,
        hora,
        horas,
        nombre,
        telefono,
        origen,
        sena: senaDe(horas),
        senaPagada: medioSena !== null,
        medioSena,
        asistencia: null,
        creadaEn: new Date().toISOString(),
      };
      const reservas = reservasGuardadas();
      reservas.push(reserva);
      guardar(CLAVES.reservas, reservas);
      avisar('reserva-nueva', reserva);
      return { ok: true, reserva };
    },

    // [Reserva] del día, incluidos los turnos fijos (origen 'fijo'), ordenadas por hora y cancha
    // En Django: esto viene de la vista de agenda del panel
    reservasDelDia(fecha) {
      if (!fechaValida(fecha)) return [];
      const marcas = leer(CLAVES.marcasFijos, {});
      const delDia = reservasGuardadas()
        .filter((reserva) => reserva.fecha === fecha)
        .concat(fijosDelDia(fijosGuardados(), fecha).map((fijo) => reservaDeFijo(fijo, fecha, marcas)));
      return delDia.sort((a, b) => a.hora - b.hora || a.canchaId.localeCompare(b.canchaId));
    },

    // [Reserva] que todavía no terminaron (incluye la que está en curso), ordenadas por fecha y hora.
    // No incluye turnos fijos: esos los maneja el dueño.
    // En Django: esto viene de la vista "Mis reservas"
    reservasDeUsuario(telefono) {
      const numero = normalizarTelefono(telefono);
      if (!numero) return [];
      const momento = ahora();
      return reservasGuardadas()
        .filter((reserva) => reserva.telefono === numero)
        .filter((reserva) => reserva.fecha > momento.fecha
          || (reserva.fecha === momento.fecha && reserva.hora + reserva.horas > momento.hora))
        .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora - b.hora);
    },

    // estado: 'vino' | 'no_vino' (null deshace la marca)
    marcarAsistencia(reservaId, estado) {
      if (![null, 'vino', 'no_vino'].includes(estado)) return fallo('La asistencia no es válida.');
      return actualizarReserva(reservaId, { asistencia: estado });
    },

    marcarSenaEfectivo(reservaId) {
      const reserva = buscarReserva(reservaId);
      if (!reserva) return fallo('No encontramos esa reserva.');
      if (reserva.senaPagada) return fallo('La seña ya está pagada.');
      return actualizarReserva(reservaId, { senaPagada: true, medioSena: 'efectivo' });
    },

    // ----- Turnos fijos -----

    turnosFijos() {
      return fijosGuardados()
        .sort((a, b) => a.diaSemana - b.diaSemana || a.hora - b.hora || a.canchaId.localeCompare(b.canchaId));
    },

    // datos = { canchaId, diaSemana (0 = domingo), hora, horas = 1, responsable, telefono? }
    // Rechaza si choca con otro fijo o con una reserva de hoy en adelante.
    // En Django: esto es el POST de la vista de turnos fijos
    crearTurnoFijo(datos = {}) {
      const cancha = buscarCancha(datos.canchaId);
      if (!cancha) return fallo('Esa cancha no existe.');
      const diaSemana = Number(datos.diaSemana);
      if (!Number.isInteger(diaSemana) || diaSemana < 0 || diaSemana > 6) return fallo('El día no es válido.');
      const hora = Number(datos.hora);
      const horas = Number(datos.horas === undefined ? 1 : datos.horas);
      if (!Number.isInteger(hora) || !Number.isInteger(horas) || horas < 1) return fallo('El turno no es válido.');
      if (hora < DESDE || hora + horas > HASTA) {
        return fallo(`Los turnos son de ${Fmt.hora(DESDE)} a ${Fmt.hora(HASTA)}.`);
      }
      const responsable = String(datos.responsable || '').trim();
      if (!responsable) return fallo('Falta el nombre del responsable.');
      let telefono = '';
      if (String(datos.telefono || '').trim()) {
        telefono = normalizarTelefono(datos.telefono);
        if (!telefono) return fallo('El teléfono no es válido.');
      }

      const nuevo = { canchaId: cancha.id, diaSemana, hora, horas };
      const fijos = fijosGuardados();
      const otroFijo = fijos.find((fijo) => fijo.canchaId === cancha.id && fijo.diaSemana === diaSemana && seSuperponen(fijo, nuevo));
      if (otroFijo) {
        return fallo(`Ya hay un turno fijo los ${Fmt.diaSemana(diaSemana)} de ${Fmt.rango(otroFijo.hora, otroFijo.horas)}.`);
      }
      const hoy = ahora().fecha;
      const reserva = reservasGuardadas()
        .filter((una) => una.fecha >= hoy && una.canchaId === cancha.id && diaDeLaSemana(una.fecha) === diaSemana)
        .sort((a, b) => a.fecha.localeCompare(b.fecha))
        .find((una) => seSuperponen(una, nuevo));
      if (reserva) {
        return fallo(`Choca con la reserva de ${reserva.nombre} del ${Fmt.dia(reserva.fecha)} de ${Fmt.rango(reserva.hora, reserva.horas)}.`);
      }

      const turnoFijo = Object.assign({ id: nuevoId('tf') }, nuevo, {
        responsable,
        telefono,
        desde: hoy,
        creadoEn: new Date().toISOString(),
      });
      fijos.push(turnoFijo);
      guardar(CLAVES.fijos, fijos);
      avisar('fijo-nuevo', turnoFijo);
      return { ok: true, turnoFijo };
    },

    borrarTurnoFijo(id) {
      const fijos = fijosGuardados();
      const turnoFijo = fijos.find((fijo) => fijo.id === id);
      if (!turnoFijo) return fallo('No encontramos ese turno fijo.');
      guardar(CLAVES.fijos, fijos.filter((fijo) => fijo.id !== id));
      // Las marcas de asistencia y seña de ese fijo ya no sirven
      const marcas = leer(CLAVES.marcasFijos, {});
      Object.keys(marcas).filter((clave) => clave.startsWith(`fijo-${id}-`)).forEach((clave) => delete marcas[clave]);
      guardar(CLAVES.marcasFijos, marcas);
      avisar('fijo-borrado', turnoFijo);
      return { ok: true, turnoFijo };
    },

    // ----- Sesión. Ámbitos 'jugador' y 'panel', independientes entre sí -----

    // Devuelve el código simulado de 4 dígitos (null si el teléfono no es válido).
    // En Django: acá se manda el código por WhatsApp y no se devuelve nunca
    enviarCodigo(telefono) {
      const numero = normalizarTelefono(telefono);
      if (!numero) return null;
      const codigo = String(1000 + Math.floor(Math.random() * 9000));
      const codigos = leer(CLAVES.codigos, {});
      codigos[numero] = codigo;
      guardar(CLAVES.codigos, codigos);
      return codigo;
    },

    verificarCodigo(telefono, codigo) {
      const numero = normalizarTelefono(telefono);
      const codigos = leer(CLAVES.codigos, {});
      if (!numero || !codigos[numero] || codigos[numero] !== String(codigo || '').trim()) return false;
      delete codigos[numero]; // cada código sirve una sola vez
      guardar(CLAVES.codigos, codigos);
      return true;
    },

    // La sesión queda guardada: si recarga la página, sigue logueado
    login(telefono, nombre, ambito = 'jugador') {
      const numero = normalizarTelefono(telefono);
      if (!numero || !AMBITOS.includes(ambito)) return null;
      const usuario = {
        telefono: numero,
        nombre: String(nombre || '').trim(),
        rol: api.esDuenio(numero) ? 'duenio' : 'jugador',
      };
      guardar(CLAVES.sesion(ambito), usuario);
      return usuario;
    },

    usuarioActual(ambito = 'jugador') {
      if (!AMBITOS.includes(ambito)) return null;
      return leer(CLAVES.sesion(ambito), null);
    },

    logout(ambito = 'jugador') {
      if (AMBITOS.includes(ambito)) borrar(CLAVES.sesion(ambito));
    },

    esDuenio(telefono) {
      return normalizarTelefono(telefono) === GOLES.telefonoDuenio;
    },

    // Agregado al contrato: '+54 9 11 2345-6789' → '1123456789' | null
    normalizarTelefono,

    // ----- Demo -----

    // Borra todo (reservas, fijos y sesiones) y vuelve a los datos iniciales
    reiniciarDemo() {
      try {
        const claves = [];
        for (let i = 0; i < localStorage.length; i++) claves.push(localStorage.key(i));
        claves
          .filter((clave) => clave && clave.startsWith(PREFIJO))
          .forEach((clave) => localStorage.removeItem(clave));
      } catch (error) { /* sin localStorage no hay nada que borrar */ }
      sembrarSiHaceFalta();
      avisar('demo-reiniciada', {});
    },

    // ----- Cambios en vivo -----

    // callback({ tipo, datos }). Avisa en esta pestaña y en otras pestañas o iframes.
    // Devuelve una función para dejar de escuchar.
    alCambiar(callback) {
      oyentes.push(callback);
      return () => {
        const posicion = oyentes.indexOf(callback);
        if (posicion >= 0) oyentes.splice(posicion, 1);
      };
    },
  };

  return api;
})();
