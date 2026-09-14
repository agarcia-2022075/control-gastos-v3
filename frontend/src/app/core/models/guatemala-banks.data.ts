export interface BankProduct {
  id: string;
  name: string;
  type: 'CREDIT' | 'DEBIT' | 'SAVINGS';
  category: 'Clásica' | 'Oro' | 'Platinum' | 'Black' | 'Débito' | 'Ahorro';
  brand: 'Visa' | 'Mastercard' | 'American Express';
  suggestedLimit: number;
  rewardsProgram: string;
  financingProgram: string;
  insuranceAndProtection: string;
  benefits: string[];
  colorGradient: 'cyan' | 'rose' | 'emerald' | 'amber' | 'purple';
}

export interface GuatemalaBank {
  id: string;
  name: string;
  shortName: string;
  slogan: string;
  badgeBg: string;
  textColor: string;
  themeColor: string;
  defaultGradient: 'cyan' | 'rose' | 'emerald' | 'amber' | 'purple';
  products: BankProduct[];
}

export const GUATEMALA_BANKS: GuatemalaBank[] = [
  {
    id: 'bi',
    name: 'Banco Industrial (Bi)',
    shortName: 'Banco Industrial',
    slogan: 'Siempre de tu lado',
    badgeBg: '#003366',
    textColor: '#38bdf8',
    themeColor: '#0284c7',
    defaultGradient: 'cyan',
    products: [
      {
        id: 'bi-debito',
        name: 'Bi Cheque Débito Visa',
        type: 'DEBIT',
        category: 'Débito',
        brand: 'Visa',
        suggestedLimit: 0,
        rewardsProgram: 'Club Bi con descuentos en comercios',
        financingProgram: 'Débito directo sin endeudamiento',
        insuranceAndProtection: 'Chip EMV seguro y notificaciones Bi Móvil instantáneas',
        benefits: [
          'Acceso inmediato a la red de cajeros Bi y red 5B en toda Guatemala',
          'Descuentos exclusivos del Club Bi en más de 500 restaurantes y tiendas',
          'Transferencias inmediatas sin costo por Bi en Línea y App Bi'
        ],
        colorGradient: 'cyan'
      },
      {
        id: 'bi-clasica',
        name: 'Bi Visa Clásica',
        type: 'CREDIT',
        category: 'Clásica',
        brand: 'Visa',
        suggestedLimit: 5000,
        rewardsProgram: '1 Punto Bi por cada Q 8.00 o $1.00 de consumo',
        financingProgram: 'Cuotas Bi sin intereses (3, 6, 10 y 12 meses)',
        insuranceAndProtection: 'Seguro de protección de compras Visa y desembolso de efectivo',
        benefits: [
          'Puntos Bi canjeables por efectivo abonado a tu saldo o compras en comercios',
          'Cuotas Bi sin recargos en cientos de comercios afiliados en todo el país',
          'Aceptación nacional e internacional en millones de comercios y compras online'
        ],
        colorGradient: 'cyan'
      },
      {
        id: 'bi-oro',
        name: 'Bi Visa Oro (Gold)',
        type: 'CREDIT',
        category: 'Oro',
        brand: 'Visa',
        suggestedLimit: 12000,
        rewardsProgram: 'Puntos Bi con bono de bienvenida y acumulación acelerada',
        financingProgram: 'Hasta 24 Cuotas Bi a tasa preferencial',
        insuranceAndProtection: 'Garantía extendida y protección de precios internacional Visa',
        benefits: [
          'Doble acumulación de Puntos Bi en gasolineras, supermercados y viajes',
          'Línea de crédito amplia para emergencias y compras importantes',
          'Acceso preferencial a preventas de conciertos y eventos culturales'
        ],
        colorGradient: 'amber'
      },
      {
        id: 'bi-platinum',
        name: 'Bi Visa Platinum',
        type: 'CREDIT',
        category: 'Platinum',
        brand: 'Visa',
        suggestedLimit: 25000,
        rewardsProgram: 'Puntos Bi Premier canjeables en aerolíneas y hoteles de lujo',
        financingProgram: 'Financiamiento exclusivo Platinum sin comisiones ocultas',
        insuranceAndProtection: 'Seguro médico internacional de viaje hasta $150,000 y pérdida de equipaje',
        benefits: [
          'Acceso gratuito e ilimitado a Salas VIP en Aeropuerto La Aurora',
          'Asistente personal Visa Concierge 24 horas para reservas y asistencia mundial',
          'Línea de atención telefónica VIP exclusiva y atención personalizada'
        ],
        colorGradient: 'purple'
      }
    ]
  },
  {
    id: 'bac',
    name: 'BAC Credomatic Guatemala',
    shortName: 'BAC Credomatic',
    slogan: 'Líder en Tarjetas de Crédito de Guatemala',
    badgeBg: '#c8102e',
    textColor: '#fda4af',
    themeColor: '#e11d48',
    defaultGradient: 'rose',
    products: [
      {
        id: 'bac-debito',
        name: 'BAC Débito Plus',
        type: 'DEBIT',
        category: 'Débito',
        brand: 'Mastercard',
        suggestedLimit: 0,
        rewardsProgram: 'Promociones temporales y descuentos en comercios BAC',
        financingProgram: 'Débito contra cuenta de ahorro o monetaria',
        insuranceAndProtection: 'Monitoreo antifraude 24/7 y bloqueo digital desde la app',
        benefits: [
          'Cero comisiones por retiro en cajeros BAC de toda Centroamérica',
          'Control total de límites de compra y bloqueo express en BAC Móvil',
          'Tecnología sin contacto (Contactless) ultra rápida'
        ],
        colorGradient: 'rose'
      },
      {
        id: 'bac-cashback',
        name: 'BAC Cashback Clásica',
        type: 'CREDIT',
        category: 'Clásica',
        brand: 'Mastercard',
        suggestedLimit: 6000,
        rewardsProgram: '5% de Cashback directo en Supermercados y Gasolineras',
        financingProgram: 'Tasa Cero BAC hasta 24 meses sin intereses',
        insuranceAndProtection: 'Protección de compras Mastercard y seguro contra fraude',
        benefits: [
          'Devolución de dinero en efectivo acreditado directamente a tu saldo mensual',
          'El programa Tasa Cero más grande del país en más de 2,000 comercios',
          'Pagos inmediatos desde la app móvil con acreditación en segundos'
        ],
        colorGradient: 'rose'
      },
      {
        id: 'bac-oro',
        name: 'BAC Puntos / Cashback Oro',
        type: 'CREDIT',
        category: 'Oro',
        brand: 'Visa',
        suggestedLimit: 14000,
        rewardsProgram: 'Puntos BAC ilimitados o 7% Cashback en comercios seleccionados',
        financingProgram: 'Tasa Cero ampliada y Minicuotas a tasas reducidas',
        insuranceAndProtection: 'Seguro de compras protegidas y garantía extendida Visa',
        benefits: [
          'Doble acumulación de Puntos BAC en compras por internet y restaurantes',
          'Canje de puntos directo en compras en comercios mediante datáfonos BAC',
          'Promociones de Miércoles BAC y descuentos exclusivos de temporada'
        ],
        colorGradient: 'amber'
      },
      {
        id: 'bac-platinum',
        name: 'BAC Millas Plus Platinum',
        type: 'CREDIT',
        category: 'Platinum',
        brand: 'American Express',
        suggestedLimit: 30000,
        rewardsProgram: 'Millas Plus acumulables para boletos aéreos en cualquier aerolínea',
        financingProgram: 'Financiamiento premium y sobregiro controlado sin penalización',
        insuranceAndProtection: 'Membresía Priority Pass y seguro integral de viaje en el extranjero',
        benefits: [
          'Millas sin vencimiento canjeables en cualquier aerolínea sin restricción de fechas',
          'Entrada a Salas VIP BAC Credomatic en aeropuertos de Centroamérica',
          'Beneficios exclusivos American Express Selects en hoteles y alquiler de autos'
        ],
        colorGradient: 'purple'
      }
    ]
  },
  {
    id: 'banrural',
    name: 'Banrural (Banco de Desarrollo Rural)',
    shortName: 'Banrural',
    slogan: 'El amigo que te ayuda a crecer',
    badgeBg: '#006837',
    textColor: '#a7f3d0',
    themeColor: '#10b981',
    defaultGradient: 'emerald',
    products: [
      {
        id: 'banrural-debito',
        name: 'Banrural Débito Señor / Señora Cuenta',
        type: 'DEBIT',
        category: 'Débito',
        brand: 'Visa',
        suggestedLimit: 0,
        rewardsProgram: 'Sorteos mensuales y promociones de temporada Banrural',
        financingProgram: 'Débito automático directo a tu cuenta de ahorros',
        insuranceAndProtection: 'Seguro de vida y auxilio funerario solidario incluido',
        benefits: [
          'La red más extensa con agencias y Cajas Rurales en los 22 departamentos',
          'Retiros sin costo en cajeros 5B Banrural en todo el país',
          'Atención en ventanilla ágil y horarios extendidos'
        ],
        colorGradient: 'emerald'
      },
      {
        id: 'banrural-paisano',
        name: 'Visa Banrural Amigo Paisano / Clásica',
        type: 'CREDIT',
        category: 'Clásica',
        brand: 'Visa',
        suggestedLimit: 4000,
        rewardsProgram: 'Puntos Banrural canjeables en efectivo y comercios',
        financingProgram: 'Cuotas Banrural hasta 18 meses a tasa preferencial',
        insuranceAndProtection: 'Seguro contra robo y clonación con cobertura nacional',
        benefits: [
          'Facilidad de pago de tarjeta a través de Cajas Rurales en cualquier municipio',
          'Compatibilidad con abonos directos desde remesas familiares',
          'Descuentos en tiendas agropecuarias, ferreterías y tecnología'
        ],
        colorGradient: 'emerald'
      },
      {
        id: 'banrural-oro',
        name: 'Visa Banrural Oro',
        type: 'CREDIT',
        category: 'Oro',
        brand: 'Visa',
        suggestedLimit: 10000,
        rewardsProgram: 'Puntos Banrural con mayor factor de acumulación',
        financingProgram: 'Cuotas Banrural sin intereses y línea de extrafinanciamiento',
        insuranceAndProtection: 'Seguro de compras protegidas y asistencia médica en ruta',
        benefits: [
          'Línea de crédito robusta con tasas de financiamiento accesibles',
          'Mayor plazo de pago de intereses (hasta 54 días de gracia)',
          'Beneficios especiales en salud y asistencia familiar'
        ],
        colorGradient: 'amber'
      }
    ]
  },
  {
    id: 'gtc',
    name: 'Banco G&T Continental',
    shortName: 'G&T Continental',
    slogan: 'No te detengas',
    badgeBg: '#002855',
    textColor: '#38bdf8',
    themeColor: '#0284c7',
    defaultGradient: 'cyan',
    products: [
      {
        id: 'gtc-debito',
        name: 'GTC Débito Fácil',
        type: 'DEBIT',
        category: 'Débito',
        brand: 'Visa',
        suggestedLimit: 0,
        rewardsProgram: 'Promociones y descuentos en comercios GTC',
        financingProgram: 'Débito directo en línea',
        insuranceAndProtection: 'Notificaciones por WhatsApp y SMS de cada consumo',
        benefits: [
          'Retiros ilimitados en red de cajeros G&T Continental y 5B',
          'Transferencias ACH gratuitas desde la app GTCApp',
          'Seguridad biométrica de última generación'
        ],
        colorGradient: 'cyan'
      },
      {
        id: 'gtc-clasica',
        name: 'GTC Visa Clásica',
        type: 'CREDIT',
        category: 'Clásica',
        brand: 'Visa',
        suggestedLimit: 5000,
        rewardsProgram: 'Puntos GTC canjeables por saldo o artículos en catálogo',
        financingProgram: 'GTC Cuotas sin intereses de 3 a 18 meses',
        insuranceAndProtection: 'Protección de compras Visa y seguro antifraude',
        benefits: [
          'Puntos GTC con catálogo de premios variado y canje inmediato',
          'Facilidad de abonos desde cualquier banco del sistema vía GuateACH',
          'Atención telefónica ágil y soporte en banca digital'
        ],
        colorGradient: 'cyan'
      },
      {
        id: 'gtc-oro',
        name: 'GTC Visa Oro',
        type: 'CREDIT',
        category: 'Oro',
        brand: 'Visa',
        suggestedLimit: 12000,
        rewardsProgram: 'Puntos GTC con bono especial de aniversario',
        financingProgram: 'GTC Cuotas ampliadas y tasa fija preferencial',
        insuranceAndProtection: 'Garantía extendida y cobertura de alquiler de vehículos',
        benefits: [
          'Línea de crédito amplia para viajes y compras familiares',
          'Promociones de 2x1 en cines y restaurantes participantes',
          'Seguro de accidentes en viajes en transporte asegurado'
        ],
        colorGradient: 'amber'
      },
      {
        id: 'gtc-platinum',
        name: 'GTC Visa Platinum',
        type: 'CREDIT',
        category: 'Platinum',
        brand: 'Visa',
        suggestedLimit: 28000,
        rewardsProgram: 'Puntos GTC Premier y acumulación en todas las monedas',
        financingProgram: 'Línea de extrafinanciamiento paralela sin afectar tu límite',
        insuranceAndProtection: 'Seguro médico internacional hasta $100,000 y Visa Concierge',
        benefits: [
          'Acceso a Sala VIP Los Añejos en el Aeropuerto Internacional La Aurora',
          'Asistente personal Visa Concierge 24/7 para viajes, conciertos y reservas',
          'Atención ejecutiva prioritaria en agencias de todo el país'
        ],
        colorGradient: 'purple'
      }
    ]
  },
  {
    id: 'bam',
    name: 'BAM (Banco Agromercantil - Grupo Bancolombia)',
    shortName: 'BAM',
    slogan: 'El banco que te conecta con Centroamérica',
    badgeBg: '#1e293b',
    textColor: '#fde047',
    themeColor: '#eab308',
    defaultGradient: 'amber',
    products: [
      {
        id: 'bam-debito',
        name: 'BAM Débito Mastercard',
        type: 'DEBIT',
        category: 'Débito',
        brand: 'Mastercard',
        suggestedLimit: 0,
        rewardsProgram: 'Descuentos exclusivos en alianza con Grupo Bancolombia',
        financingProgram: 'Débito contra saldo disponible',
        insuranceAndProtection: 'Protección para transacciones digitales y tecnología contactless',
        benefits: [
          'Respaldo regional de Grupo Bancolombia en Centroamérica y Colombia',
          'Banca digital ágil con pagos directos desde el teléfono móvil',
          'Cero costo de manejo de cuenta por mantener saldo promedio'
        ],
        colorGradient: 'amber'
      },
      {
        id: 'bam-clasica',
        name: 'Mastercard BAM Estilo / Clásica',
        type: 'CREDIT',
        category: 'Clásica',
        brand: 'Mastercard',
        suggestedLimit: 5500,
        rewardsProgram: 'Puntos BAM canjeables por boletos, hoteles y compras',
        financingProgram: 'Cuotas BAM sin intereses hasta 12 meses',
        insuranceAndProtection: 'Protección de compras Mastercard y seguro de precio protegido',
        benefits: [
          'Puntos BAM con amplia vigencia para canjear en viajes y comercios',
          'Facilidad de cuotas automáticas desde la banca en línea',
          'Notificaciones de consumo en tiempo real al teléfono'
        ],
        colorGradient: 'amber'
      },
      {
        id: 'bam-platinum',
        name: 'Mastercard BAM Platinum',
        type: 'CREDIT',
        category: 'Platinum',
        brand: 'Mastercard',
        suggestedLimit: 26000,
        rewardsProgram: 'Puntos BAM acelerados en compras internacionales y en línea',
        financingProgram: 'Extrafinanciamiento preferencial BAM sin comisión de desembolso',
        insuranceAndProtection: 'Pase a Salas VIP Mastercard Airport Experiences y Concierge 24/7',
        benefits: [
          'Acceso a salones VIP internacionales con el programa Mastercard LoungeKey',
          'Servicio de Concierge dedicado para reservas de restaurantes y espectáculos',
          'Protección total de compras y cobertura internacional en viajes'
        ],
        colorGradient: 'purple'
      }
    ]
  },
  {
    id: 'promerica',
    name: 'Banco Promerica Guatemala',
    shortName: 'Banco Promerica',
    slogan: 'Desde siempre pensando en ti',
    badgeBg: '#1e3a29',
    textColor: '#86efac',
    themeColor: '#22c55e',
    defaultGradient: 'emerald',
    products: [
      {
        id: 'promerica-club',
        name: 'Promerica Club Premia Clásica',
        type: 'CREDIT',
        category: 'Clásica',
        brand: 'Visa',
        suggestedLimit: 5000,
        rewardsProgram: 'Puntos Premia con opción de abono directo en efectivo a tu tarjeta',
        financingProgram: 'Club Promerica Cuotas sin recargo de 3 a 24 meses',
        insuranceAndProtection: 'Seguro de compras protegidas y cobertura antifraude 24h',
        benefits: [
          'Canje de puntos directo por dinero para reducir la cuota mensual',
          'Promociones permanentes de 2x1 en restaurantes y cines aliados',
          'Programa de beneficios en salud y farmacias en toda Guatemala'
        ],
        colorGradient: 'emerald'
      },
      {
        id: 'promerica-oro',
        name: 'Promerica Premia Oro',
        type: 'CREDIT',
        category: 'Oro',
        brand: 'Visa',
        suggestedLimit: 12000,
        rewardsProgram: 'Doble acumulación de Puntos Premia en compras internacionales',
        financingProgram: 'Plazos de financiamiento ampliados con tasa preferencial',
        insuranceAndProtection: 'Garantía extendida y seguro de alquiler de autos en el extranjero',
        benefits: [
          'Línea de crédito generosa con cuotas flexibles',
          'Descuentos de hasta 20% en comercios seleccionados del Club Promerica',
          'Membresía anual exonerable por uso continuo de la tarjeta'
        ],
        colorGradient: 'amber'
      }
    ]
  },
  {
    id: 'custom',
    name: 'Otro Banco / Tarjeta Personalizada',
    shortName: 'Personalizada',
    slogan: 'Entidad financiera o cooperativa guatemalteca',
    badgeBg: '#334155',
    textColor: '#e2e8f0',
    themeColor: '#64748b',
    defaultGradient: 'cyan',
    products: [
      {
        id: 'custom-debito',
        name: 'Tarjeta Débito (Cuenta Personalizada)',
        type: 'DEBIT',
        category: 'Débito',
        brand: 'Visa',
        suggestedLimit: 0,
        rewardsProgram: 'Beneficios de tu banco o cooperativa (Bantrab, CHN, Vivibanco, Micoope)',
        financingProgram: 'Débito directo contra fondos propios',
        insuranceAndProtection: 'Seguridad proporcionada por tu entidad financiera',
        benefits: [
          'Control y registro independiente de tu saldo bancario',
          'Compatibilidad total con reportes y estadísticas de gastos'
        ],
        colorGradient: 'cyan'
      },
      {
        id: 'custom-credito',
        name: 'Tarjeta de Crédito (Personalizada)',
        type: 'CREDIT',
        category: 'Clásica',
        brand: 'Visa',
        suggestedLimit: 6000,
        rewardsProgram: 'Programa de recompensas de tu emisor financiero',
        financingProgram: 'Financiamiento autorizado por tu banco',
        insuranceAndProtection: 'Línea de crédito personal protegida',
        benefits: [
          'Línea de crédito asignada por tu entidad financiera de preferencia',
          'Monitoreo del saldo disponible, deuda acumulada y porcentaje de utilización'
        ],
        colorGradient: 'rose'
      }
    ]
  }
];
