import firstSheet from '../assets/avatars/animals-01-25-white.png'
import secondSheet from '../assets/avatars/animals-26-34-white.png'
import dragonSheet from '../assets/avatars/dragon-white.png'

// Display only the portrait region of each approved sheet; captions stay outside the crop.
export const AVATAR_OPTIONS = [
  { id: "black-cat", name: "Suspicious Black cat", sheet: firstSheet, x: 34, y: 14, width: 216, height: 212 },
  { id: "hound-dog", name: "Nonchalant Hound dog", sheet: firstSheet, x: 274, y: 14, width: 215, height: 212 },
  { id: "grizzly-bear", name: "Grumpy Grizzly bear", sheet: firstSheet, x: 512, y: 12, width: 223, height: 214 },
  { id: "horse", name: "Confident Horse", sheet: firstSheet, x: 759, y: 13, width: 218, height: 213 },
  { id: "axolotl", name: "Excited Axolotl", sheet: firstSheet, x: 1003, y: 12, width: 216, height: 214 },
  { id: "oranda-goldfish", name: "Proud Oranda goldfish", sheet: firstSheet, x: 31, y: 258, width: 219, height: 216 },
  { id: "wolf", name: "Secretive Wolf", sheet: firstSheet, x: 273, y: 258, width: 220, height: 216 },
  { id: "capybara", name: "Zoned out Capybara", sheet: firstSheet, x: 515, y: 258, width: 221, height: 216 },
  { id: "frog", name: "Happy Frog", sheet: firstSheet, x: 758, y: 258, width: 220, height: 215 },
  { id: "snake", name: "Curious Snake", sheet: firstSheet, x: 1003, y: 258, width: 218, height: 216 },
  { id: "penguin", name: "Bashful Penguin", sheet: firstSheet, x: 31, y: 508, width: 219, height: 215 },
  { id: "rabbit", name: "Hopeful Rabbit", sheet: firstSheet, x: 272, y: 508, width: 220, height: 216 },
  { id: "jaguar", name: "Determined Jaguar", sheet: firstSheet, x: 511, y: 506, width: 226, height: 220 },
  { id: "otter", name: "Mischievous Otter", sheet: firstSheet, x: 757, y: 507, width: 221, height: 217 },
  { id: "goose", name: "Offended Goose", sheet: firstSheet, x: 1003, y: 508, width: 219, height: 216 },
  { id: "black-mamba", name: "Unimpressed Black mamba", sheet: firstSheet, x: 31, y: 756, width: 219, height: 212 },
  { id: "tortoise", name: "Patient Tortoise", sheet: firstSheet, x: 272, y: 756, width: 221, height: 214 },
  { id: "butterfly", name: "Dreamy Butterfly", sheet: firstSheet, x: 512, y: 755, width: 224, height: 216 },
  { id: "cardinal", name: "Dramatic Cardinal", sheet: firstSheet, x: 756, y: 757, width: 220, height: 214 },
  { id: "black-widow-spider", name: "Wary Black widow spider", sheet: firstSheet, x: 1003, y: 755, width: 221, height: 217 },
  { id: "pig", name: "Content Pig", sheet: firstSheet, x: 28, y: 1000, width: 222, height: 214 },
  { id: "skunk", name: "Skeptical Skunk", sheet: firstSheet, x: 269, y: 1001, width: 224, height: 214 },
  { id: "orca", name: "Playful Orca", sheet: firstSheet, x: 512, y: 1000, width: 225, height: 216 },
  { id: "hedgehog", name: "Sleepy Hedgehog", sheet: firstSheet, x: 755, y: 1000, width: 226, height: 215 },
  { id: "praying-mantis", name: "Focused Praying mantis", sheet: firstSheet, x: 1003, y: 1000, width: 219, height: 216 },
  { id: "white-lamb", name: "Happy White lamb", sheet: secondSheet, x: 68, y: 23, width: 350, height: 349 },
  { id: "pangolin", name: "Offended Pangolin", sheet: secondSheet, x: 450, y: 21, width: 353, height: 351 },
  { id: "giraffe", name: "Bashful Giraffe", sheet: secondSheet, x: 836, y: 20, width: 347, height: 352 },
  { id: "hippo", name: "Dreamy Hippo", sheet: secondSheet, x: 58, y: 418, width: 360, height: 352 },
  { id: "seahorse", name: "Secretive Seahorse", sheet: secondSheet, x: 449, y: 419, width: 354, height: 352 },
  { id: "koala", name: "Patient Koala", sheet: secondSheet, x: 836, y: 418, width: 357, height: 353 },
  { id: "jellyfish", name: "Curious Jellyfish", sheet: secondSheet, x: 56, y: 811, width: 360, height: 356 },
  { id: "chameleon", name: "Dramatic Chameleon", sheet: secondSheet, x: 447, y: 811, width: 359, height: 358 },
  { id: "peacock", name: "Proud Peacock", sheet: secondSheet, x: 836, y: 811, width: 360, height: 358 },
  { id: "red-dragon", name: "Dramatic Red dragon", sheet: dragonSheet, x: 118, y: 68, width: 1018, height: 1018 },
]
export const isValidAvatarId = id => id === null || id === '' || AVATAR_OPTIONS.some(avatar => avatar.id === id)
