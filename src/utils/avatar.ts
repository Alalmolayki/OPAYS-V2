const GRADIENTS = [
  'from-blue-500 to-cyan-600',
  'from-green-500 to-emerald-600',
  'from-amber-500 to-orange-600',
  'from-purple-500 to-violet-600',
  'from-pink-500 to-rose-600',
  'from-indigo-500 to-blue-600',
  'from-teal-500 to-green-600',
  'from-cyan-500 to-blue-500',
];

export function avatarGradient(id: string): string {
  const sum = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return `bg-gradient-to-br ${GRADIENTS[sum % GRADIENTS.length]}`;
}
