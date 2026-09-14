export interface GuatemalaServicePreset {
  id: string;
  name: string;
  provider: string;
  category: 'Servicios' | 'Vivienda' | 'Educación' | 'Entretenimiento' | 'Seguros' | 'Otros';
  suggestedAmount: number;
  defaultBillingDay: number;
  icon: string;
  colorClass: string;
  description: string;
}

export const GUATEMALA_SERVICE_PRESETS: GuatemalaServicePreset[] = [
  {
    id: 'eegsa',
    name: 'Energía Eléctrica EEGSA',
    provider: 'EEGSA (Empresa Eléctrica de Guatemala)',
    category: 'Servicios',
    suggestedAmount: 350.00,
    defaultBillingDay: 15,
    icon: 'fa-bolt',
    colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    description: 'Factura mensual de luz eléctrica (Guatemala, Sacatepéquez, Escuintla)'
  },
  {
    id: 'energuate',
    name: 'Energía Eléctrica Energuate',
    provider: 'Energuate (DEORSA / DEOCSA)',
    category: 'Servicios',
    suggestedAmount: 280.00,
    defaultBillingDay: 18,
    icon: 'fa-bolt',
    colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    description: 'Servicio de luz eléctrica departamental y municipios del interior'
  },
  {
    id: 'empagua',
    name: 'Agua Potable Empagua',
    provider: 'Empagua (Municipalidad de Guatemala)',
    category: 'Servicios',
    suggestedAmount: 120.00,
    defaultBillingDay: 20,
    icon: 'fa-faucet-drip',
    colorClass: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    description: 'Suministro y canon de agua potable metropolitana'
  },
  {
    id: 'claro-internet',
    name: 'Internet Residencial Claro',
    provider: 'Claro Guatemala',
    category: 'Servicios',
    suggestedAmount: 265.00,
    defaultBillingDay: 10,
    icon: 'fa-wifi',
    colorClass: 'text-red-400 bg-red-500/10 border-red-500/30',
    description: 'Plan de fibra óptica / internet y televisión Claro Hogar'
  },
  {
    id: 'tigo-internet',
    name: 'Internet Residencial Tigo',
    provider: 'Tigo Guatemala',
    category: 'Servicios',
    suggestedAmount: 279.00,
    defaultBillingDay: 12,
    icon: 'fa-wifi',
    colorClass: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    description: 'Plan residencial Tigo One / Internet de alta velocidad'
  },
  {
    id: 'tigo-movil',
    name: 'Plan Postpago Tigo',
    provider: 'Tigo Guatemala',
    category: 'Servicios',
    suggestedAmount: 185.00,
    defaultBillingDay: 25,
    icon: 'fa-mobile-screen-button',
    colorClass: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    description: 'Plan móvil postpago con llamadas y datos libres'
  },
  {
    id: 'claro-movil',
    name: 'Plan Postpago Claro',
    provider: 'Claro Guatemala',
    category: 'Servicios',
    suggestedAmount: 175.00,
    defaultBillingDay: 25,
    icon: 'fa-mobile-screen-button',
    colorClass: 'text-red-400 bg-red-500/10 border-red-500/30',
    description: 'Plan mensual móvil Claro Sin Fronteras'
  },
  {
    id: 'renta-vivienda',
    name: 'Alquiler / Renta Residencial',
    provider: 'Propietario / Arrendamiento',
    category: 'Vivienda',
    suggestedAmount: 2500.00,
    defaultBillingDay: 1,
    icon: 'fa-house',
    colorClass: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    description: 'Cuota mensual de arrendamiento habitacional'
  },
  {
    id: 'mantenimiento-condominio',
    name: 'Mantenimiento de Garita y Condominio',
    provider: 'Asociación de Vecinos / Garita',
    category: 'Vivienda',
    suggestedAmount: 350.00,
    defaultBillingDay: 5,
    icon: 'fa-shield-halved',
    colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    description: 'Seguridad privada, garita, recolección de basura y áreas verdes'
  },
  {
    id: 'colegiatura',
    name: 'Colegiatura Escolar / Universidad',
    provider: 'Institución Educativa',
    category: 'Educación',
    suggestedAmount: 1200.00,
    defaultBillingDay: 5,
    icon: 'fa-graduation-cap',
    colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    description: 'Mensualidad educativa (Colegio / Universidad del Valle / Landívar / San Carlos / Marroquín)'
  },
  {
    id: 'netflix',
    name: 'Suscripción Streaming (Netflix / Max / Disney)',
    provider: 'Servicio Digital',
    category: 'Entretenimiento',
    suggestedAmount: 95.00,
    defaultBillingDay: 14,
    icon: 'fa-tv',
    colorClass: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
    description: 'Servicio mensual de contenido bajo demanda'
  },
  {
    id: 'seguro-medico',
    name: 'Seguro Médico / Gastos Médicos',
    provider: 'Aseguradora (Roble / G&T / Universales)',
    category: 'Seguros',
    suggestedAmount: 650.00,
    defaultBillingDay: 10,
    icon: 'fa-heart-pulse',
    colorClass: 'text-teal-400 bg-teal-500/10 border-teal-500/30',
    description: 'Póliza de seguro individual o familiar de salud'
  }
];
