export const welcomeMessages = [
  "¡Hoy es tu día, {name}! Cada rep te acerca a tu mejor versión.",
  "¡{name}, los grandes resultados empiezan con un primer paso!",
  "¡Bienvenido, {name}! Tu cuerpo puede más de lo que crees.",
  "¡{name}, la consistencia es el arma secreta de los campeones!",
  "¡Hoy vas a superar tus límites, {name}!",
  "¡{name}, el dolor de hoy es la fuerza de mañana!",
  "¡Arriba, {name}! El gym te espera con todo.",
  "¡{name}, cada entrenamiento te hace más fuerte por dentro y por fuera!",
  "¡Que empiece la magia, {name}! Hoy es un gran día.",
  "¡{name}, los campeones no se rinden — y vos tampoco!",
  "¡Bienvenido de vuelta, {name}! Tu versión mejorada empieza hoy.",
  "¡{name}, el esfuerzo de hoy es el logro de mañana!",
  "¡Hora de brillar, {name}! Tu entrenamiento te espera.",
  "¡{name}, lo imposible solo tarda un poco más!",
  "¡Vamos con todo, {name}! Hoy es el día que recordarás.",
  "¡{name}, cada gota de sudor es un paso hacia tu meta!",
  "¡Bienvenido, {name}! Hoy escribís una nueva página en tu historia.",
  "¡{name}, la mente cede antes que el cuerpo — seguí adelante!",
  "¡Hoy más que nunca, {name}! Nada puede detenerte.",
  "¡{name}, el esfuerzo nunca traiciona!",
  "¡A entrenar, {name}! El progreso no espera.",
  "¡{name}, vos elegís ser extraordinario cada vez que entrás aquí!",
  "¡Que bien que viniste, {name}! Esto es lo que te hace diferente.",
  "¡{name}, la disciplina es la base de todo gran logro!",
  "¡Listo para romperla, {name}! Hoy vas a quedar con todo.",
  "¡{name}, el camino al éxito pasa por este entrenamiento!",
  "¡A darlo todo, {name}! Tu mejor versión está esperando.",
  "¡{name}, en cada rep construís el cuerpo que querés!",
  "¡Hola {name}! Otro día, otra oportunidad de ser mejor.",
  "¡{name}, la grandeza se construye rep a rep, día a día!",
  "¡Bienvenido, {name}! Las excusas no te trajeron hasta aquí.",
  "¡{name}, el único mal entrenamiento es el que no se hace!",
  "¡Hoy vas a sorprenderte, {name}! Empezá fuerte.",
  "¡{name}, los resultados no mienten — seguí entrenando!",
  "¡A moverla, {name}! El gimnasio es tu lugar.",
  "¡{name}, cada sesión es una inversión en vos mismo!",
  "¡Vamos {name}! Hoy el límite lo ponés vos.",
  "¡{name}, la fuerza no es solo física — es mental!",
  "¡Llegaste, {name}! Y eso ya es la mitad de la batalla.",
  "¡{name}, construís tu mejor versión una rutina a la vez!",
  "¡Hora de entrenar, {name}! Esto es lo que te diferencia.",
  "¡{name}, el sudor de hoy es la sonrisa de mañana!",
  "¡Bienvenido, {name}! Hoy dejás todo en el piso.",
  "¡{name}, los que se rinden nunca saben lo cerca que estaban!",
  "¡A romperla, {name}! Tu momento es ahora.",
  "¡{name}, cada entrenamiento es un regalo para tu cuerpo!",
  "¡Gran día para entrenar, {name}! Aprovechalo.",
  "¡{name}, la constancia hace lo que el talento no puede!",
  "¡Hoy sos imparable, {name}!",
  "¡{name}, empezá fuerte y terminá más fuerte aún!"
];

export const completedMessages = [
  "¡Terminaste, {name}! Ese es el esfuerzo que marca la diferencia.",
  "¡Campeón, {name}! Otro entrenamiento en el bolsillo.",
  "¡Lo lograste, {name}! Tu cuerpo te lo va a agradecer.",
  "¡Misión cumplida, {name}! Hoy fuiste más fuerte que ayer.",
  "¡Excelente trabajo, {name}! Descansá que te lo merecés.",
  "¡{name}, dejaste todo! Eso es lo que construye resultados.",
  "¡Bien hecho, {name}! Cada sesión te acerca más a tu meta.",
  "¡{name}, lo completaste! Eso es disciplina de verdad.",
  "¡Brutal, {name}! Hoy demostraste quién mandas.",
  "¡{name}, superaste el día! Eso no tiene precio."
];

export function getRandomWelcome(name) {
  const msg = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
  return msg.replace(/{name}/g, name);
}

export function getRandomCompleted(name) {
  const msg = completedMessages[Math.floor(Math.random() * completedMessages.length)];
  return msg.replace(/{name}/g, name);
}
