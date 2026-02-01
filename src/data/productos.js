export const data = {
  categorias: [
    {
      id: "calzado",
      nombre: "Calzado",
      url: "calzado.html",
      imagen:
        "https://images.unsplash.com/photo-1542291026-7eec264c27ff?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80",
      colorFondo: "bg-red-500/70",
    },

    {
      id: "relojeria",
      nombre: "Relojería",
      url: "relojeria.html",
      imagen:
        "https://images.unsplash.com/photo-1523275335684-37898b6baf30?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1099&q=80",
      colorFondo: "bg-gray-500/70",
    },

    {
      id: "tecnologia",
      nombre: "Tecnología",
      url: "tecnologia.html",
      imagen:
        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80",
      colorFondo: "bg-yellow-500/70",
    },

    {
      id: "deportes",
      nombre: "Deportes",
      url: "deportes.html",
      imagen:
        "https://images.unsplash.com/photo-1517649763962-0c623066013b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80",
      colorFondo: "bg-blue-500/70",
    },
  ],
  productos: [
    {
      id: "reloj-tempus",
      nombre: "Reloj 'Tempus'",
      categoria: "relojeria",
      precio: "149.50",
      precioAnterior: "199.99",
      disponibles: 8,
      referencia: "RT-001",
      marca: "Genta Watches",
      descripcion:
        "Elegancia y precisión en tu muñeca. Un diseño clásico que nunca pasa de moda, perfecto para cualquier ocasión.",
      imagen1:
        "https://images.unsplash.com/photo-1523275335684-37898b6baf30?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1099&q=80",
      imagen2:
        "https://images.unsplash.com/photo-1547996160-81dfa3853553?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=774&q=80",
      imagen3:
        "https://images.unsplash.com/photo-1612817159949-195b6eb9e31a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80",
    },

    {
      id: "reloj-odara",
      nombre: "Reloj Odara Space'",
      categoria: "relojeria",
      precio: "149.50",
      precioAnterior: "199.99",
      disponibles: 8,
      referencia: "RT-001",
      marca: "Space",
      descripcion: "Sofisticación y estilo en cada detalle.",
      imagen1:
        "https://images.unsplash.com/photo-1523275335684-37898b6baf30?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1099&q=80",
      imagen2:
        "https://images.unsplash.com/photo-1547996160-81dfa3853553?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=774&q=80",
      imagen3:
        "https://images.unsplash.com/photo-1612817159949-195b6eb9e31a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80",
    },

    {
      id: "zapatilla-velocity",
      nombre: "Zapatilla 'Velocity'",
      categoria: "calzado",
      precio: "99.99",
      precioAnterior: "120.00",
      disponibles: 15,
      referencia: "ZV-001",
      marca: "Genta Sports",
      descripcion:
        "Diseñadas para la máxima velocidad y comodidad, ideales para corredores exigentes.",
      imagen1:
        "https://images.unsplash.com/photo-1542291026-7eec264c27ff?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80",
      imagen2:
        "https://images.unsplash.com/photo-1549298916-b41d501d3772?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80",
      imagen3:
        "https://images.unsplash.com/photo-1515955656352-a1fa3ffcdda9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80",
    },
    {
      id: "auriculares-aura",
      nombre: "Auriculares 'Aura'",
      categoria: "tecnologia",
      precio: "79.00",
      precioAnterior: "99.00",
      disponibles: 25,
      referencia: "AU-001",
      marca: "Genta Audio",
      descripcion:
        "Sonido inmersivo y cancelación de ruido para una experiencia auditiva sin igual.",
      imagen1:
        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80",
      imagen2:
        "https://images.unsplash.com/photo-1546435770-a3e426bf4022?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=774&q=80",
      imagen3:
        "https://images.unsplash.com/photo-1613040809024-b4ef7ba99bc3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80",
    },
    {
      id: "balon-profesional",
      nombre: "Balón Profesional 'GOL'",
      categoria: "deportes",
      precio: "45.00",
      precioAnterior: "60.00",
      disponibles: 30,
      referencia: "BP-001",
      marca: "Genta Sports",
      descripcion:
        "Balón de fútbol profesional con diseño aerodinámico para un control superior en el campo.",
      imagen1:
        "https://images.unsplash.com/photo-1551958214-2d5e23a3c683?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80",
      imagen2:
        "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?ixlib=rb-4.0.3&auto=format&fit=crop&w=774&q=80",
      imagen3:
        "https://images.unsplash.com/photo-1521422944438-3161c56435e8?ixlib=rb-4.0.3&auto=format&fit=crop&w=774&q=80",
    },
  ],
};
