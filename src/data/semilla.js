// Datos iniciales: las personas y los cuatro espacios de trabajo.
// Los proyectos se van cargando desde la app; aquí solo queda la estructura.

export const semilla = {
  colaboradores: [
    {
      id: 'col_richard',
      nombre: 'Richard',
      rol: 'Desarrollo',
      area: 'Dirección',
      email: 'rifigue97@gmail.com',
      telefono: '',
      fechaIngreso: '',
      habilidades: ['Desarrollo', 'Arquitectura'],
      notas: 'Dueño de los cuatro espacios.',
      activo: true,
    },
    {
      id: 'col_jose',
      nombre: 'Jose',
      rol: 'Socio comercial',
      area: 'Ventas',
      email: '',
      telefono: '',
      fechaIngreso: '',
      habilidades: ['Ventas'],
      notas: 'Vende; Richard desarrolla.',
      activo: true,
    },
    {
      id: 'col_jaime',
      nombre: 'Jaime',
      rol: 'Socio',
      area: '',
      email: '',
      telefono: '',
      fechaIngreso: '',
      habilidades: [],
      notas: '',
      activo: true,
    },
    {
      id: 'col_yimi',
      nombre: 'Yimi',
      rol: 'Socio',
      area: '',
      email: '',
      telefono: '',
      fechaIngreso: '',
      habilidades: [],
      notas: '',
      activo: true,
    },
  ],

  // Cada sociedad es un compartimento estanco: quien está en uno no ve los otros
  // ni sabe que existen.
  espacios: [
    {
      id: 'esp_jose',
      nombre: 'Jose & Richard',
      tipo: 'sociedad',
      descripcion: 'Jose vende, Richard desarrolla.',
      color: '#2563eb',
      repoPorDefecto: { propietario: 'Richard7856', nombre: '', rama: 'main' },
    },
    {
      id: 'esp_jaime',
      nombre: 'Jaime & Richard',
      tipo: 'sociedad',
      descripcion: '',
      color: '#7c3aed',
      repoPorDefecto: { propietario: 'Richard7856', nombre: '', rama: 'main' },
    },
    {
      id: 'esp_yimi',
      nombre: 'Yimi & Richard',
      tipo: 'sociedad',
      descripcion: '',
      color: '#0891b2',
      repoPorDefecto: { propietario: 'Richard7856', nombre: '', rama: 'main' },
    },
    {
      id: 'esp_personal',
      nombre: 'Proyectos personales',
      tipo: 'personal',
      descripcion: 'Solo Richard.',
      color: '#16a34a',
      repoPorDefecto: { propietario: 'Richard7856', nombre: '', rama: 'main' },
    },
  ],

  miembros: [
    { id: 'mbr_r_jose', espacioId: 'esp_jose', colaboradorId: 'col_richard', rolEspacio: 'dueno' },
    { id: 'mbr_jose', espacioId: 'esp_jose', colaboradorId: 'col_jose', rolEspacio: 'socio' },

    { id: 'mbr_r_jaime', espacioId: 'esp_jaime', colaboradorId: 'col_richard', rolEspacio: 'dueno' },
    { id: 'mbr_jaime', espacioId: 'esp_jaime', colaboradorId: 'col_jaime', rolEspacio: 'socio' },

    { id: 'mbr_r_yimi', espacioId: 'esp_yimi', colaboradorId: 'col_richard', rolEspacio: 'dueno' },
    { id: 'mbr_yimi', espacioId: 'esp_yimi', colaboradorId: 'col_yimi', rolEspacio: 'socio' },

    { id: 'mbr_r_personal', espacioId: 'esp_personal', colaboradorId: 'col_richard', rolEspacio: 'dueno' },
  ],

  proyectos: [],
  tareas: [],
}

export const vacio = {
  colaboradores: [],
  espacios: [],
  miembros: [],
  proyectos: [],
  tareas: [],
}

export const USUARIO_POR_DEFECTO = 'col_richard'
