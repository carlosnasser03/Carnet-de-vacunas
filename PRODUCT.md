# Product

## Register

product

## Users

Dueños de mascotas (perro, gato u otras especies) que manejan la salud de sus
animales sin un sistema. Hoy el registro vive en tres lugares malos a la vez: un
papelito que da la veterinaria y se pierde, la memoria del dueño, y el WhatsApp
de la clínica. El uso es esporádico y a ráfagas: se abre cuando se aplica una
vacuna, cuando el animal se enferma, o cuando alguien pregunta "¿ya le tocaba?".

Contexto de uso: teléfono en la mano, muchas veces de pie en el consultorio
veterinario copiando lo que acaba de pasar, o en casa a las 11 de la noche
anotando que el perro lleva dos días vomitando y qué se le dio.

El trabajo a resolver, en orden:

1. Que no se pase la fecha de la próxima vacuna.
2. Tener a la mano el historial de qué se le ha dado y cuándo.
3. Poder mostrar el carnet completo a un veterinario, una guardería o una
   aerolínea sin buscar papeles.

Es una app para uso propio y como pieza de portafolio. No hay cuentas, no hay
servidor: los datos viven en el dispositivo del usuario.

## Product Purpose

Un carnet de vacunación digital para mascotas que reemplaza al papel: guarda las
dosis aplicadas, calcula sola la siguiente fecha, y lleva una bitácora de
enfermedades y medicamentos.

Debe funcionar en cualquier país. Los esquemas de vacunación vienen precargados
con los intervalos de referencia internacionales (WSAVA) pero todos son
editables, porque la normativa de rabia y los productos disponibles cambian por
región. La app sugiere, el veterinario decide.

Éxito se ve así: el dueño abre la app tres o cuatro veces al año, en dos
minutos registra lo que pasó, y nunca más se le pasa un refuerzo. Si el usuario
tiene que pensar cómo usarla, falló.

## Brand Personality

Documento oficial. Serio, guardable, con peso institucional — un pasaporte de
vacunación, no una app de mascotas. Tres palabras: **formal, legible, duradero**.

La voz es la de un documento, no la de un producto: etiquetas de campo, fechas
completas, nada de exclamaciones ni de celebrar al usuario por registrar una
vacuna. El único momento de calidez permitido es la mascota misma: su foto
tratada como foto de pasaporte y su nombre con el peso tipográfico de un titular.

El estado sanitario (al día / por vencer / vencida) es la única información que
puede gritar, y grita con tipografía y posición antes que con color.

## Anti-references

- **Startup genérica de IA**: nada de degradados morados, texto con degradado,
  tarjetas idénticas en grid, ni el look de plantilla SaaS.
- **Expediente de hospital**: nada de azul corporativo frío, tablas grises
  densas, ni sensación burocrática.
- **Panel de datos**: nada de gráficas, KPIs gigantes ni métricas. Es un carnet.
  Un peso registrado es un dato del documento, no una serie de tiempo.
- **App infantil de mascotas**: sin ser una prohibición dura del usuario, el
  registro de documento oficial ya excluye huellitas de fondo y tipografía
  redondeada.

## Design Principles

1. **Es un documento, no una pantalla.** Debe poder imprimirse y seguir
   sirviendo. Si un elemento no sobreviviría al papel, probablemente sobra.
2. **La fecha siguiente es la interfaz.** Lo primero que se ve al abrir una
   mascota es qué le toca y cuándo. Todo lo demás es archivo.
3. **Capturar en menos de un minuto.** El usuario está de pie en el consultorio.
   Cada campo opcional se ve opcional; nada bloquea guardar salvo el mínimo.
4. **Sugerir sin recetar.** Los intervalos son valores por defecto visibles y
   editables, nunca reglas ocultas. La app jamás afirma un criterio médico.
5. **Los datos son del usuario.** Todo local, exportable e importable en un
   archivo legible. Nada se pierde por cambiar de teléfono.

## Accessibility & Inclusion

- WCAG 2.1 AA como piso: texto de cuerpo ≥4.5:1, texto grande ≥3:1.
- Navegable completamente por teclado, con foco visible en todo control.
- El estado sanitario nunca se comunica solo por color: siempre lleva etiqueta
  de texto y forma distinta.
- `prefers-reduced-motion` respetado en toda transición.
- Áreas de toque: 44 px de alto en acciones primarias y pestañas, 40 px en
  secundarias, nunca menos de 36 px. Por encima del mínimo de 24×24 px que pide
  WCAG 2.2 en nivel AA.
- Modo claro y oscuro según preferencia del sistema.
