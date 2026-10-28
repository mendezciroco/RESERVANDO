// Tokens de diseño de Reservando. Se carga justo después del CDN de Tailwind.
// Valores de la identidad "Noche de cancha" que eligió PC 3 (ver NOTAS-PC3.md en la rama marca).
// Solo PC 3 cambia los valores; los nombres de los tokens no se tocan nunca.
tailwind.config = {
  theme: {
    extend: {
      colors: {
        // Identidad de Reservando
        marca: { DEFAULT: '#C6F432', claro: '#F3F5F0', oscuro: '#0E1311' },
        // Color del complejo. PROVISORIO hasta tener los de GOLES
        club: { DEFAULT: '#2F7BFF', claro: '#8DB8FF', oscuro: '#1747A6' },
        // Estados de turnos y canchas
        libre: '#22B45E',
        ocupado: '#FF5A4E',
        fijo: '#FFB547',
        alerta: '#FF5A4E',
      },
      fontFamily: {
        titulo: ['"Barlow Condensed"', '"Arial Narrow"', 'sans-serif'],
        texto: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
};
