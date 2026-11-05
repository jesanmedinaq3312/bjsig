export type PublicModuleFeature = {
  title: string;
  description: string;
};

export type PublicModule = {
  slug: string;
  label: string;
  title: string;
  seoTitle: string;
  description: string;
  lead: string;
  sectionTitle: string;
  sectionBody: string;
  features: PublicModuleFeature[];
  included: string[];
  related: string[];
};

export const PUBLIC_MODULES: PublicModule[] = [
  {
    slug: "plataforma-multiempresa",
    label: "Plataforma multiempresa",
    title: "Software multiempresa para gestionar organizaciones y módulos",
    seoTitle: "Plataforma SaaS multiempresa | BJSIGAPP",
    description:
      "Administra varias empresas desde una plataforma SaaS con organizaciones, sucursales, planes, módulos, permisos y branding configurables.",
    lead: "BJSIGAPP reúne la administración de varias organizaciones en una plataforma SaaS. El equipo configura el alcance de cada empresa y mantiene su operación vinculada al contexto correspondiente.",
    sectionTitle: "Configura cada empresa según su propia operación",
    sectionBody:
      "Desde el control de plataforma puedes administrar organizaciones, sucursales, planes y módulos disponibles. Los permisos y la identidad visual se ajustan por empresa, mientras la información operativa permanece asociada a su organización.",
    features: [
      {
        title: "Empresas y sucursales",
        description:
          "Mantén la estructura de organizaciones y sedes para que cada equipo trabaje en el contexto que le corresponde.",
      },
      {
        title: "Planes y módulos",
        description:
          "Define el conjunto de módulos habilitados para cada empresa de acuerdo con su configuración.",
      },
      {
        title: "Accesos e identidad",
        description:
          "Configura roles, permisos y elementos de branding por organización desde el control SaaS.",
      },
    ],
    included: [
      "Empresas y sucursales",
      "Planes y módulos",
      "Roles y permisos",
      "Branding por empresa",
    ],
    related: ["recursos-humanos", "auditoria-y-trazabilidad", "indicadores-y-reportes"],
  },
  {
    slug: "recursos-humanos",
    label: "Recursos humanos y personas",
    title: "Software de recursos humanos para organizar la gestión de personas",
    seoTitle: "Software de recursos humanos | BJSIGAPP",
    description:
      "Organiza trabajadores, estructura, vacaciones, licencias y procesos de personas con información vinculada a cada empresa.",
    lead: "Centraliza la información de trabajadores y conecta sus datos con los procesos de personas disponibles para la empresa. Cada registro se consulta dentro de la organización correspondiente.",
    sectionTitle: "La información de cada persona, relacionada con su trabajo",
    sectionBody:
      "Consulta trabajadores y estructura organizacional en el mismo entorno. Las áreas, cargos, responsables y módulos de personas ayudan a dar contexto a las tareas y solicitudes cotidianas.",
    features: [
      {
        title: "Fichas y estructura",
        description:
          "Organiza trabajadores, departamentos, cargos y relaciones de dependencia en la vista de la empresa.",
      },
      {
        title: "Procesos laborales",
        description:
          "Accede a los módulos disponibles para vacaciones, licencias médicas, nómina, desempeño y finiquitos.",
      },
      {
        title: "Información conectada",
        description:
          "Relaciona documentos y comunicaciones con las personas y equipos que participan en cada proceso.",
      },
    ],
    included: [
      "Trabajadores",
      "Departamentos y organigrama",
      "Vacaciones y licencias médicas",
      "Nómina y liquidaciones",
      "Desempeño y desarrollo",
      "Finiquitos",
    ],
    related: ["asistencia-y-turnos", "portal-del-trabajador", "documentos-y-cumplimiento"],
  },
  {
    slug: "asistencia-y-turnos",
    label: "Asistencia y turnos",
    title: "Control de asistencia y gestión de turnos para empresas",
    seoTitle: "Software de asistencia y turnos | BJSIGAPP",
    description:
      "Organiza turnos, asistencia, calendarios y cambios de jornada con una vista vinculada a trabajadores y empresas.",
    lead: "Planifica turnos y consulta la asistencia desde el contexto de la empresa. La información relacionada con cada trabajador ayuda a ordenar los cambios de jornada y su seguimiento.",
    sectionTitle: "Turnos y asistencia dentro de una misma vista operativa",
    sectionBody:
      "El equipo puede revisar asignaciones, ciclos y calendarios, y mantener visible el contexto de cada trabajador. La disponibilidad de funciones depende de los módulos habilitados para la empresa.",
    features: [
      {
        title: "Asignación de turnos",
        description:
          "Organiza turnos y ciclos por trabajador, equipo o sucursal y consulta sus cambios en el contexto correspondiente.",
      },
      {
        title: "Asistencia y calendario",
        description:
          "Revisa registros y fechas de trabajo junto con las vistas operativas que la empresa tenga habilitadas.",
      },
      {
        title: "Consulta del colaborador",
        description:
          "El Portal del Trabajador puede mostrar información de asistencia y turnos asignados según su configuración.",
      },
    ],
    included: [
      "Asistencia",
      "Gestión de turnos",
      "Calendario",
      "Consulta en el Portal del Trabajador",
    ],
    related: ["recursos-humanos", "portal-del-trabajador", "indicadores-y-reportes"],
  },
  {
    slug: "prevencion-de-riesgos",
    label: "Prevención de riesgos y terreno",
    title: "Software de prevención de riesgos para el trabajo en terreno",
    seoTitle: "Prevención de riesgos y trabajo en terreno | BJSIGAPP",
    description:
      "Registra actividades de terreno, incidentes, matrices IPER y acciones de seguimiento con responsables y evidencias.",
    lead: "Ordena las actividades de prevención que ocurren en terreno y da continuidad a los registros relacionados con incidentes, inspecciones y acciones de seguimiento.",
    sectionTitle: "Del registro en terreno al seguimiento de acciones",
    sectionBody:
      "Reúne vistas de terreno, incidentes, matrices y auditorías para que los equipos consulten antecedentes y mantengan visibles responsables, evidencias y estados según el proceso configurado.",
    features: [
      {
        title: "Actividades e inspecciones",
        description:
          "Registra controles diarios, hallazgos y observaciones de terreno vinculados a la empresa y sus equipos.",
      },
      {
        title: "Incidentes y acciones",
        description:
          "Documenta incidentes y organiza su seguimiento con responsables y respaldos dentro del flujo de la empresa.",
      },
      {
        title: "Matrices y auditorías",
        description:
          "Consulta las vistas disponibles para matrices IPER, auditorías ISO y revisión de acciones correctivas.",
      },
    ],
    included: [
      "Control Diario de Terreno",
      "Incidentes DS 44",
      "Matriz IPER",
      "Auditoría ISO",
      "Charlas de Seguridad DIT",
    ],
    related: ["epp-e-inventario", "capacitaciones", "indicadores-y-reportes"],
  },
  {
    slug: "epp-e-inventario",
    label: "EPP e inventario",
    title: "Control de EPP e inventario para cada empresa",
    seoTitle: "Control de EPP e inventario | BJSIGAPP",
    description:
      "Registra inventario, entregas y movimientos de EPP con información relacionada con trabajadores y bodegas.",
    lead: "Mantén los registros de elementos de protección personal e inventario en una vista conectada con las personas y la operación de cada empresa.",
    sectionTitle: "Stock y entregas con trazabilidad por trabajador",
    sectionBody:
      "Consulta la información disponible para bodega, entrega, firma y reposición de EPP. Los registros se mantienen vinculados a la empresa y a las personas que participan en el proceso.",
    features: [
      {
        title: "Inventario y bodega",
        description:
          "Organiza los elementos y consulta sus movimientos desde el módulo de EPP y bodega habilitado.",
      },
      {
        title: "Entrega al trabajador",
        description:
          "Registra la entrega de elementos y conserva el historial asociado al trabajador.",
      },
      {
        title: "Reposición y seguimiento",
        description:
          "Mantén visibles las necesidades de reposición y la información relacionada con cada entrega.",
      },
    ],
    included: ["EPP & Bodega", "Inventario", "Entregas", "Firmas y registros de reposición"],
    related: ["prevencion-de-riesgos", "recursos-humanos", "auditoria-y-trazabilidad"],
  },
  {
    slug: "capacitaciones",
    label: "Capacitaciones",
    title: "Gestión de capacitaciones y evaluaciones para trabajadores",
    seoTitle: "Gestión de capacitaciones laborales | BJSIGAPP",
    description:
      "Planifica actividades, asigna capacitaciones y consulta asistencia, evaluaciones y avance de trabajadores o grupos.",
    lead: "Organiza las actividades de capacitación y consulta su avance en relación con trabajadores o grupos. Los registros quedan disponibles para el seguimiento que realice la empresa.",
    sectionTitle: "Planifica, asigna y consulta el avance",
    sectionBody:
      "Mantén juntas las actividades, personas convocadas y registros de participación. La empresa puede revisar evaluaciones y pendientes desde las vistas de capacitación habilitadas.",
    features: [
      {
        title: "Planificación",
        description:
          "Registra actividades y organiza a quiénes están dirigidas según la estructura de la empresa.",
      },
      {
        title: "Participación y evaluación",
        description:
          "Consulta asistencia y evaluaciones relacionadas con cada actividad cuando esas funciones están habilitadas.",
      },
      {
        title: "Seguimiento de avance",
        description: "Revisa actividades realizadas y pendientes por trabajador o grupo.",
      },
    ],
    included: [
      "Capacitaciones",
      "Asignación a trabajadores o grupos",
      "Asistencia",
      "Evaluaciones y avance",
    ],
    related: ["portal-del-trabajador", "prevencion-de-riesgos", "indicadores-y-reportes"],
  },
  {
    slug: "portal-del-trabajador",
    label: "Portal del trabajador",
    title: "Portal del trabajador para documentos, turnos y solicitudes",
    seoTitle: "Portal del trabajador | BJSIGAPP",
    description:
      "Entrega a cada colaborador un acceso personal para consultar documentos, turnos, capacitaciones, solicitudes y comunicaciones.",
    lead: "Cada colaborador accede a un espacio personal relacionado con su empresa. Allí puede consultar la información y las funciones que la organización tenga habilitadas para su perfil.",
    sectionTitle: "Un acceso personal a la información del trabajo",
    sectionBody:
      "El portal acerca documentos, asistencia, turnos, capacitaciones, solicitudes y comunicaciones al trabajador. La experiencia se adapta a los módulos disponibles y a los permisos definidos por la empresa.",
    features: [
      {
        title: "Consultas personales",
        description:
          "El colaborador revisa la información de trabajo disponible para su cuenta y su organización.",
      },
      {
        title: "Documentos y capacitaciones",
        description:
          "Accede a documentos y actividades de formación que la empresa haya puesto a su disposición.",
      },
      {
        title: "Solicitudes y comunicaciones",
        description:
          "Consulta avisos y utiliza los flujos de solicitud disponibles para su perfil.",
      },
    ],
    included: [
      "Documentos",
      "Asistencia y turnos",
      "Capacitaciones",
      "Solicitudes",
      "Comunicaciones",
    ],
    related: ["recursos-humanos", "documentos-y-cumplimiento", "asistencia-y-turnos"],
  },
  {
    slug: "documentos-y-cumplimiento",
    label: "Documentos y cumplimiento",
    title: "Gestión documental y seguimiento de cumplimiento empresarial",
    seoTitle: "Gestión documental y cumplimiento | BJSIGAPP",
    description:
      "Organiza documentos laborales y normativos, junto con vistas para privacidad, auditoría y seguimiento por empresa.",
    lead: "Agrupa la documentación laboral y normativa con las vistas de cumplimiento disponibles para cada organización. Los documentos y registros conservan su relación con el contexto empresarial.",
    sectionTitle: "Documentos que se pueden consultar por contexto",
    sectionBody:
      "Mantén documentos y antecedentes asociados a personas, procesos y empresas. La plataforma incluye vistas de documentación normativa, privacidad y control para apoyar el trabajo interno.",
    features: [
      {
        title: "Documentación laboral",
        description:
          "Consulta documentos vinculados a trabajadores y procesos de personas desde los módulos habilitados.",
      },
      {
        title: "Documentos normativos",
        description:
          "Organiza referencias y antecedentes normativos en la vista correspondiente a la empresa.",
      },
      {
        title: "Privacidad y controles",
        description:
          "Accede a vistas relacionadas con privacidad y brechas de seguridad según la configuración del servicio.",
      },
    ],
    included: [
      "Documentos en la Nube",
      "Documentación Normativa",
      "Privacidad y GDPR",
      "Brechas de Seguridad Ley 21.663",
    ],
    related: ["recursos-humanos", "portal-del-trabajador", "auditoria-y-trazabilidad"],
  },
  {
    slug: "canal-de-denuncias",
    label: "Canal de denuncias",
    title: "Canal de denuncias interno con seguimiento por empresa",
    seoTitle: "Canal de denuncias interno | BJSIGAPP",
    description:
      "Ordena la recepción y el seguimiento de denuncias internas con responsables, estados y evidencias según el proceso definido.",
    lead: "Dispón de un canal estructurado para recibir y dar seguimiento a denuncias internas. La gestión se realiza de acuerdo con los procedimientos y permisos que defina cada empresa.",
    sectionTitle: "Un flujo trazable para recibir y gestionar reportes",
    sectionBody:
      "Centraliza los antecedentes del reporte y su estado de seguimiento. Los accesos, responsables y pasos del proceso deben corresponder a las políticas vigentes de la organización.",
    features: [
      {
        title: "Recepción de reportes",
        description: "Registra los antecedentes iniciales en el canal disponible para la empresa.",
      },
      {
        title: "Seguimiento y responsables",
        description:
          "Ordena el avance del caso y las acciones asociadas de acuerdo con el procedimiento configurado.",
      },
      {
        title: "Evidencias e historial",
        description:
          "Mantén documentación y actividad relacionada para consulta por las personas autorizadas.",
      },
    ],
    included: ["Canal de Denuncias", "Seguimiento", "Responsables", "Registros y evidencias"],
    related: ["ley-karin", "auditoria-y-trazabilidad", "documentos-y-cumplimiento"],
  },
  {
    slug: "ley-karin",
    label: "Ley Karin y convivencia laboral",
    title: "Gestión de procesos relacionados con la Ley Karin",
    seoTitle: "Ley Karin y protocolos laborales | BJSIGAPP",
    description:
      "Apoya la organización de protocolos, denuncias, investigaciones, medidas y antecedentes vinculados a convivencia laboral.",
    lead: "Organiza los antecedentes relacionados con los protocolos de convivencia laboral y los procesos que cada empresa defina para gestionar reportes e investigaciones.",
    sectionTitle: "Registros organizados para el procedimiento de cada empresa",
    sectionBody:
      "BJSIGAPP apoya la gestión y la trazabilidad de los antecedentes que la empresa registre. La plataforma no reemplaza la asesoría legal ni determina por sí sola el cumplimiento de una obligación.",
    features: [
      {
        title: "Protocolos y medidas",
        description:
          "Mantén los antecedentes y medidas asociados al procedimiento interno que la empresa haya definido.",
      },
      {
        title: "Denuncias e investigaciones",
        description:
          "Da seguimiento a reportes y actividades relacionadas mediante las vistas disponibles para el personal autorizado.",
      },
      {
        title: "Evidencia y trazabilidad",
        description: "Conserva referencias a los documentos y acciones vinculados con el proceso.",
      },
    ],
    included: [
      "Protocolos",
      "Canal de Denuncias Ley Karin",
      "Investigaciones",
      "Medidas y evidencias",
    ],
    related: ["canal-de-denuncias", "documentos-y-cumplimiento", "auditoria-y-trazabilidad"],
  },
  {
    slug: "solicitudes-y-comunicaciones",
    label: "Solicitudes y comunicaciones",
    title: "Solicitudes y comunicaciones para equipos de trabajo",
    seoTitle: "Solicitudes y comunicaciones internas | BJSIGAPP",
    description:
      "Centraliza requerimientos de colaboradores, avisos y respuestas mediante los flujos configurados para cada empresa.",
    lead: "Conecta a trabajadores y equipos de administración a través de solicitudes y comunicaciones asociadas a la operación de la empresa.",
    sectionTitle: "Cada solicitud con un estado y un siguiente paso",
    sectionBody:
      "Los flujos disponibles ayudan a registrar requerimientos, asignar responsables y consultar respuestas desde un solo entorno. Los permisos determinan qué información ve cada perfil.",
    features: [
      {
        title: "Solicitudes de trabajadores",
        description:
          "Recibe y ordena requerimientos según los tipos de solicitud habilitados para la organización.",
      },
      {
        title: "Avisos y comunicaciones",
        description:
          "Publica comunicaciones internas y permite que los colaboradores consulten las que les corresponden.",
      },
      {
        title: "Seguimiento de respuesta",
        description:
          "Mantén visible el avance y la respuesta de cada solicitud dentro del flujo de trabajo.",
      },
    ],
    included: ["Comunicaciones", "Solicitudes", "Aprobaciones", "Avisos y respuestas"],
    related: ["portal-del-trabajador", "recursos-humanos", "auditoria-y-trazabilidad"],
  },
  {
    slug: "finanzas-y-proveedores",
    label: "Finanzas y proveedores",
    title: "Gestión operativa de finanzas y proveedores",
    seoTitle: "Finanzas y proveedores para empresas | BJSIGAPP",
    description:
      "Consulta tesorería, proveedores, compromisos y procesos comerciales en los módulos financieros configurados para tu empresa.",
    lead: "Mantén cerca de la operación los procesos de tesorería, proveedores y gestión comercial que la empresa tenga habilitados.",
    sectionTitle: "Procesos financieros vinculados al contexto empresarial",
    sectionBody:
      "Las vistas financieras permiten consultar la información operativa disponible para la organización. El alcance depende del plan y de los módulos configurados para cada empresa.",
    features: [
      {
        title: "Tesorería y proveedores",
        description: "Consulta los módulos de tesorería y proveedores disponibles para la empresa.",
      },
      {
        title: "Comercial y facturación",
        description: "Organiza procesos comerciales y de facturación desde las vistas habilitadas.",
      },
      {
        title: "Finanzas extendidas",
        description:
          "Revisa los indicadores y controles operativos incluidos en la configuración financiera.",
      },
    ],
    included: ["Tesorería & Proveedores", "Comercial & Facturación", "Finanzas Extendidas"],
    related: ["indicadores-y-reportes", "plataforma-multiempresa", "auditoria-y-trazabilidad"],
  },
  {
    slug: "indicadores-y-reportes",
    label: "Indicadores y reportes",
    title: "Indicadores y reportes para la gestión de personas y operaciones",
    seoTitle: "Indicadores y reportes empresariales | BJSIGAPP",
    description:
      "Consulta paneles, indicadores, exportaciones y alertas para entender la actividad y los pendientes de tu empresa.",
    lead: "Reúne en paneles la información disponible sobre personas, asistencia, prevención, capacitación, inventario y actividad.",
    sectionTitle: "Una vista de la operación con el contexto de cada empresa",
    sectionBody:
      "Los indicadores y reportes ayudan a revisar actividad y pendientes sin perder de vista la organización consultada. La información visible depende de los módulos y permisos habilitados.",
    features: [
      {
        title: "Panel de gestión",
        description:
          "Consulta las vistas e indicadores que relacionan los módulos disponibles para la empresa.",
      },
      {
        title: "Reportes y exportaciones",
        description:
          "Revisa reportes o exportaciones según las funciones y permisos que tenga configurados cada perfil.",
      },
      {
        title: "Alertas y pendientes",
        description:
          "Da seguimiento a vencimientos y tareas visibles dentro de los procesos habilitados.",
      },
    ],
    included: ["Dashboard", "Indicadores", "Reportes", "Exportaciones y alertas"],
    related: ["prevencion-de-riesgos", "asistencia-y-turnos", "capacitaciones"],
  },
  {
    slug: "auditoria-y-trazabilidad",
    label: "Auditoría y trazabilidad",
    title: "Auditoría y trazabilidad de la actividad empresarial",
    seoTitle: "Auditoría y trazabilidad empresarial | BJSIGAPP",
    description:
      "Consulta registros de actividad, roles, permisos y controles de acceso dentro del contexto de cada organización.",
    lead: "Da contexto a las acciones relevantes de la plataforma mediante registros de actividad y permisos vinculados con los perfiles y empresas correspondientes.",
    sectionTitle: "Accesos y actividad con responsables identificables",
    sectionBody:
      "La gestión de roles, la separación por empresa y el registro de actividad ayudan a mantener contexto para los controles internos. Los registros visibles dependen de la configuración de seguridad.",
    features: [
      {
        title: "Roles y permisos",
        description:
          "Controla el acceso a vistas y módulos de acuerdo con los permisos asignados a cada perfil.",
      },
      {
        title: "Registro de actividad",
        description:
          "Consulta actividad relevante y su contexto cuando el registro esté habilitado para el proceso.",
      },
      {
        title: "Controles de acceso",
        description:
          "Administra los controles disponibles para cuentas privilegiadas, incluida la autenticación multifactor configurada.",
      },
    ],
    included: ["Configuración", "Registro de Actividad", "MFA administrativo", "Datos por empresa"],
    related: ["plataforma-multiempresa", "documentos-y-cumplimiento", "canal-de-denuncias"],
  },
];

export const PUBLIC_MODULES_BY_SLUG = Object.fromEntries(
  PUBLIC_MODULES.map((module) => [module.slug, module]),
) as Record<string, PublicModule | undefined>;

export function getPublicModulePath(slug: string) {
  return `/modulos/${slug}`;
}
