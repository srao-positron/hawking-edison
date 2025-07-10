// Generate human-readable IDs for user-facing entities

const adjectives = [
  'autumn', 'blue', 'bold', 'bright', 'calm', 'clear', 'cool', 'crisp',
  'daring', 'dawn', 'deep', 'eager', 'early', 'easy', 'fast', 'fierce',
  'gentle', 'glad', 'golden', 'grand', 'great', 'green', 'happy', 'keen',
  'kind', 'late', 'light', 'little', 'lively', 'lonely', 'long', 'lucky',
  'merry', 'mighty', 'morning', 'noble', 'peaceful', 'proud', 'quick', 'quiet',
  'rapid', 'ready', 'rich', 'royal', 'sharp', 'shiny', 'silent', 'silver',
  'simple', 'smooth', 'solid', 'spring', 'steady', 'strong', 'summer', 'sunny',
  'sweet', 'swift', 'tall', 'tiny', 'true', 'twilight', 'warm', 'wild',
  'winter', 'wise', 'yellow', 'young'
]

const nouns = [
  'brook', 'cloud', 'comet', 'creek', 'dawn', 'day', 'dew', 'dream',
  'dust', 'echo', 'field', 'fire', 'flame', 'flower', 'fog', 'forest',
  'frost', 'garden', 'glade', 'grass', 'grove', 'hill', 'lake', 'leaf',
  'light', 'meadow', 'mist', 'moon', 'mountain', 'night', 'ocean', 'path',
  'peak', 'pine', 'plain', 'pond', 'rain', 'river', 'road', 'rock',
  'rose', 'sea', 'shadow', 'shore', 'sky', 'smoke', 'snow', 'spring',
  'star', 'stone', 'storm', 'stream', 'sun', 'thunder', 'tree', 'valley',
  'water', 'wave', 'wind', 'wood'
]

function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

export function generateHumanId(): string {
  const adjective = randomElement(adjectives)
  const noun = randomElement(nouns)
  const number = Math.floor(Math.random() * 1000)
  
  return `${adjective}-${noun}-${number}`
}