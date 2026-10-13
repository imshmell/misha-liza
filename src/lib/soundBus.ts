// Звук на сайте — только из одного источника: песня ИЛИ одно видео со звуком.
// Кто начинает звучать, объявляет себя; остальные слушают и замолкают.
type Listener = (owner: symbol) => void;
const listeners = new Set<Listener>();

// играет ли сейчас песня: автозвук фона (мосты) её не перебивает — только явное нажатие «звук»
let songOn = false;
export const setSongPlaying = (on: boolean) => (songOn = on);
export const songPlaying = () => songOn;

export function claimSound(owner: symbol) {
  listeners.forEach((l) => l(owner));
}

export function onSoundClaim(l: Listener) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
