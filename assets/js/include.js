// Carga los componentes: reemplaza cada <div data-include="ruta"> por el HTML de ese archivo.
// La ruta es relativa a la página. Los atributos data-* del div (por ejemplo data-ambito)
// pasan al primer elemento del componente, así su x-data los lee con $el.dataset.
// Si el archivo todavía no existe, deja un recuadro gris con su nombre y la página sigue andando.
// Al terminar dispara 'componentes-listos' en window y vuelve a dibujar los íconos de Lucide.
// En Django: cada data-include pasa a ser un {% include %} y este archivo desaparece.
(() => {
  const VUELTAS_MAXIMAS = 5; // por si un componente incluye a otro

  async function cargar(contenedor) {
    const ruta = contenedor.getAttribute('data-include');
    try {
      const respuesta = await fetch(ruta, { cache: 'no-cache' });
      if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
      const plantilla = document.createElement('template');
      plantilla.innerHTML = (await respuesta.text()).trim();
      pasarAtributos(contenedor, plantilla.content.firstElementChild);
      contenedor.replaceWith(plantilla.content);
    } catch (error) {
      console.warn(`include.js: no se pudo cargar ${ruta}`, error);
      contenedor.replaceWith(recuadroPendiente(ruta));
    }
  }

  function pasarAtributos(origen, destino) {
    if (!destino) return;
    Array.from(origen.attributes)
      .filter((atributo) => atributo.name.startsWith('data-') && atributo.name !== 'data-include')
      .filter((atributo) => !destino.hasAttribute(atributo.name))
      .forEach((atributo) => destino.setAttribute(atributo.name, atributo.value));
  }

  function recuadroPendiente(ruta) {
    const recuadro = document.createElement('div');
    recuadro.className = 'componente-pendiente';

    const titulo = document.createElement('strong');
    titulo.textContent = ruta.split('/').pop();
    recuadro.append(titulo);

    const detalle = document.createElement('span');
    detalle.textContent = location.protocol === 'file:'
      ? 'Abrí la página con Live Server: con doble clic no se cargan los componentes.'
      : 'Componente pendiente';
    recuadro.append(detalle);

    return recuadro;
  }

  async function incluirTodo() {
    for (let vuelta = 0; vuelta < VUELTAS_MAXIMAS; vuelta++) {
      const pendientes = Array.from(document.querySelectorAll('[data-include]'));
      if (pendientes.length === 0) break;
      await Promise.all(pendientes.map(cargar));
    }
    if (window.lucide) lucide.createIcons();
    window.componentesListos = true; // para quien llegue tarde al evento
    window.dispatchEvent(new CustomEvent('componentes-listos'));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', incluirTodo);
  } else {
    incluirTodo();
  }
})();
