// Lógica del plano del predio (componentes/plano.html).
// Escucha 'cambio-horario' { fecha, hora } y dispara 'cancha-elegida' { canchaId }.
function plano() {
  return {
    fecha: null,
    hora: null,
    estados: {},   // { f5: 'libre' | 'ocupada' } para la fecha y hora que se están mirando
    elegida: null,
    aviso: '',

    init() {
      window.addEventListener('cambio-horario', (evento) => this.mirar(evento.detail));
      // Si entra una reserva (en esta pestaña o en otra) se repinta solo
      Store.alCambiar(() => this.actualizar());
    },

    mirar({ fecha, hora }) {
      this.fecha = fecha;
      this.hora = hora;
      this.aviso = '';
      this.actualizar();
    },

    actualizar() {
      if (this.fecha === null || this.hora === null) return;
      // En Django: esto viene de la vista de turnos del día
      const estados = {};
      Store.turnosDelDia(this.fecha)
        .filter((turno) => turno.hora === this.hora)
        .forEach((turno) => {
          estados[turno.canchaId] = turno.estado === 'libre' ? 'libre' : 'ocupada';
        });
      this.estados = estados;
      if (this.elegida && estados[this.elegida] !== 'libre') this.elegida = null;
    },

    // 'neutro' hasta que la app avise qué horario se está mirando
    estado(canchaId) {
      return this.estados[canchaId] || 'neutro';
    },

    nombre(canchaId) {
      const cancha = Store.canchas().find((c) => c.id === canchaId);
      return cancha ? cancha.nombre : canchaId;
    },

    rotulo(canchaId) {
      const textos = { neutro: '', libre: ' · LIBRE', ocupada: ' · OCUPADA' };
      return canchaId.toUpperCase() + textos[this.estado(canchaId)];
    },

    etiqueta(canchaId) {
      const textos = { neutro: 'elegí un horario primero', libre: 'libre', ocupada: 'ocupada' };
      return `${this.nombre(canchaId)}, ${textos[this.estado(canchaId)]}`;
    },

    titular() {
      if (this.hora === null) return 'Elegí un día y un horario para ver qué cancha está libre.';
      const libres = Object.values(this.estados).filter((e) => e === 'libre').length;
      if (libres === 0) return 'No hay canchas libres en este horario.';
      if (this.elegida) return `Elegiste la ${this.nombre(this.elegida)}.`;
      return libres === 1 ? 'Tocá la cancha libre para elegirla.' : 'Las 2 canchas están libres. Tocá una.';
    },

    tocar(canchaId) {
      const estado = this.estado(canchaId);
      if (estado === 'neutro') {
        this.aviso = 'Primero elegí un día y un horario.';
        return;
      }
      if (estado === 'ocupada') {
        this.aviso = `La ${this.nombre(canchaId)} está ocupada a las ${Fmt.hora(this.hora)}.`;
        return;
      }
      this.elegida = canchaId;
      this.aviso = '';
      window.dispatchEvent(new CustomEvent('cancha-elegida', { detail: { canchaId } }));
    },
  };
}
