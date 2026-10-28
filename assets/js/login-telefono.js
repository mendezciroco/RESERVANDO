// Lógica del ingreso con teléfono (componentes/login-telefono.html), usada con x-data="loginTelefono()".
// El ámbito ('jugador' | 'panel') llega en el atributo data-ambito del include.
// data-modo: 'hoja' (por defecto, se puede cerrar) o 'pagina' (tarjeta fija, abierta mientras no haya sesión).
// Se abre con el evento 'pedir-login' { ambito } y al terminar dispara 'sesion-iniciada' { ambito, usuario }.
// Si ya hay sesión en ese ámbito, no se abre: avisa 'sesion-iniciada' directamente.
function loginTelefono() {
  return {
    ambito: 'jugador',
    modo: 'hoja',
    complejo: {},
    abierta: false,
    paso: 'telefono',      // 'telefono' | 'codigo' | 'nombre' | 'listo'
    telefonoTexto: '',     // lo que escribe, formateado: '11 2345-6789'
    telefono: null,        // normalizado: '1123456789'
    digitos: ['', '', '', ''],
    nombre: '',
    usuario: null,
    error: '',
    temblar: false,
    notificacion: false,   // la notificación que imita a WhatsApp
    codigoEnviado: '',
    temporizadorNotificacion: null,

    init() {
      this.ambito = this.$el.dataset.ambito || 'jugador';
      this.modo = this.$el.dataset.modo === 'pagina' ? 'pagina' : 'hoja';
      // En Django: el complejo viene del contexto de la vista
      this.complejo = Store.complejo();
      if (this.modo === 'pagina' && !Store.usuarioActual(this.ambito)) this.abrir();
    },

    // En modo página no se cierra; en los dos, no se cierra mientras dice "¡Listo!"
    get cerrable() {
      return this.modo !== 'pagina' && this.paso !== 'listo';
    },

    abrir(detalle = {}) {
      if (detalle.ambito && detalle.ambito !== this.ambito) return;
      const usuario = Store.usuarioActual(this.ambito);
      if (usuario) return this.avisarSesion(usuario);
      this.paso = 'telefono';
      this.error = '';
      this.digitos = ['', '', '', ''];
      this.nombre = '';
      this.abierta = true;
      this.$nextTick(() => this.$refs.telefono.focus());
    },

    cerrar() {
      this.abierta = false;
      this.notificacion = false;
    },

    // ---------- Paso 1: celular ----------

    // Mientras escribe: solo números, sin el 0 de larga distancia, con el formato '11 2345-6789'
    formatearTelefono(evento) {
      const digitos = evento.target.value.replace(/\D/g, '').replace(/^0/, '').slice(0, 10);
      const area = digitos.startsWith('11') ? 2 : 3;
      let texto = digitos.slice(0, area);
      if (digitos.length > area) texto += ' ' + digitos.slice(area, 6);
      if (digitos.length > 6) texto += '-' + digitos.slice(6);
      this.telefonoTexto = texto;
      evento.target.value = texto;
      this.error = '';
    },

    get telefonoValido() {
      return Store.normalizarTelefono(this.telefonoTexto) !== null;
    },

    enviarCodigo() {
      const telefono = Store.normalizarTelefono(this.telefonoTexto);
      if (!telefono) {
        this.error = 'Revisá el número: son 10 dígitos con el código de área, sin 0 ni 15.';
        return;
      }
      if (this.ambito === 'panel' && !Store.esDuenio(telefono)) {
        this.error = `Ese celular no es el del dueño de ${this.complejo.nombre}.`;
        return;
      }
      this.telefono = telefono;
      // En Django: acá el servidor manda el código por WhatsApp y no lo devuelve nunca
      this.codigoEnviado = Store.enviarCodigo(telefono);
      this.paso = 'codigo';
      this.digitos = ['', '', '', ''];
      this.error = '';
      this.$nextTick(() => this.enfocarDigito(0));
      // Un ratito de espera, como si llegara el mensaje
      this.notificacion = false;
      clearTimeout(this.temporizadorNotificacion);
      this.temporizadorNotificacion = setTimeout(() => {
        this.notificacion = true;
        this.temporizadorNotificacion = setTimeout(() => { this.notificacion = false; }, 9000);
      }, 900);
    },

    get telefonoMostrado() {
      return '+54 9 ' + Fmt.telefono(this.telefono);
    },

    cambiarNumero() {
      this.paso = 'telefono';
      this.notificacion = false;
      this.$nextTick(() => this.$refs.telefono.focus());
    },

    // ---------- Paso 2: código ----------

    campos() {
      return this.$root.querySelectorAll('[data-digito]');
    },

    enfocarDigito(indice) {
      const campo = this.campos()[indice];
      if (campo) campo.focus();
    },

    // Acepta un dígito o varios (el autocompletado del celular pega el código entero en una casilla)
    alEscribir(indice, evento) {
      const numeros = evento.target.value.replace(/\D/g, '');
      if (!numeros) {
        this.digitos[indice] = '';
        evento.target.value = '';
        return;
      }
      this.repartir(numeros, indice);
      evento.target.value = this.digitos[indice];
    },

    alBorrar(indice, evento) {
      if (this.digitos[indice] || indice === 0) return; // borra la casilla actual como siempre
      evento.preventDefault();
      this.digitos[indice - 1] = '';
      this.enfocarDigito(indice - 1);
    },

    alPegar(evento) {
      const numeros = (evento.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
      if (numeros) this.repartir(numeros, 0);
    },

    // Reparte los números desde una casilla, salta a la siguiente vacía y verifica al completar las 4
    repartir(numeros, desde) {
      numeros.slice(0, 4 - desde).split('').forEach((numero, i) => { this.digitos[desde + i] = numero; });
      this.error = '';
      const vacia = this.digitos.findIndex((digito) => !digito);
      if (vacia === -1) {
        this.campos().forEach((campo) => campo.blur());
        this.verificar();
      } else {
        const siguiente = desde + numeros.length;
        this.enfocarDigito(siguiente <= 3 ? siguiente : vacia);
      }
    },

    // Para la demo: tocar la notificación completa el código
    usarCodigoDeNotificacion() {
      this.notificacion = false;
      if (this.paso === 'codigo') this.repartir(this.codigoEnviado, 0);
    },

    verificar() {
      const codigo = this.digitos.join('');
      if (codigo.length < 4) return;
      if (!Store.verificarCodigo(this.telefono, codigo)) {
        this.error = 'El código no es correcto. Probá de nuevo.';
        this.temblar = true;
        setTimeout(() => { this.temblar = false; }, 450);
        this.digitos = ['', '', '', ''];
        this.$nextTick(() => this.enfocarDigito(0));
        return;
      }
      this.notificacion = false;
      const conocido = this.nombreConocido();
      if (conocido) return this.entrar(conocido);
      this.paso = 'nombre';
      this.$nextTick(() => this.$refs.nombre.focus());
    },

    // Si ya reservó o ya entró en el otro ámbito, no le volvemos a pedir el nombre.
    // En Django: esto lo resuelve la vista buscando el usuario por teléfono
    nombreConocido() {
      const sesiones = ['jugador', 'panel'].map((ambito) => Store.usuarioActual(ambito));
      const sesion = sesiones.find((usuario) => usuario && usuario.telefono === this.telefono && usuario.nombre);
      if (sesion) return sesion.nombre;
      const reserva = Store.reservasDeUsuario(this.telefono)[0];
      return reserva ? reserva.nombre : '';
    },

    // ---------- Paso 3: nombre (solo la primera vez) ----------

    guardarNombre() {
      const nombre = this.nombre.trim();
      if (nombre.length < 2) {
        this.error = 'Contanos cómo te llamás.';
        return;
      }
      this.entrar(nombre);
    },

    // ---------- Final ----------

    entrar(nombre) {
      // En Django: esto es el POST de la vista de login, que deja la sesión abierta
      this.usuario = Store.login(this.telefono, nombre, this.ambito);
      this.error = '';
      this.paso = 'listo';
      setTimeout(() => {
        this.cerrar();
        this.avisarSesion(this.usuario);
      }, 1100);
    },

    get primerNombre() {
      return this.usuario ? this.usuario.nombre.split(' ')[0] : '';
    },

    avisarSesion(usuario) {
      window.dispatchEvent(new CustomEvent('sesion-iniciada', { detail: { ambito: this.ambito, usuario } }));
    },
  };
}
