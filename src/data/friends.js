// One entry per level. Fill these in as each friend sends their submission:
//   name           -> their name (shown on the reveal card)
//   photoTogether  -> path to a photo of them + Akansha together, e.g. "/friends/priya-together.jpg"
//   photoSolo      -> path to a solo photo of them, e.g. "/friends/priya-solo.jpg"
//                     (used for the map avatar; leave either photo null to fall back to a colored initial avatar)
//   color          -> placeholder avatar color, used until photos are added
//   gender         -> 'male' or 'female' -- picks which in-game body build
//                     (see src/game/humanoid.js) she plays as/rescues in
//                     their level and the dragon finale. Double-check the
//                     handful marked below -- unisex names, guessed blind.
//   message        -> their birthday message to Akansha
//   firstMet       -> where they first met her
//   firstImpression -> their first impression of her
//   nowImpression  -> their impression of her now (can be brutally honest / funny)
//   quality        -> one quality they really like/appreciate about her
//
// Order = level order. Rearrange freely; the game just walks the array in order.

export const friends = [
  mkFriend(1, 'Arpit', '#ff8fab', 'male', '/friends/arpit-face.jpg'),
  mkFriend(2, 'Pulkit (Husband)', '#ffd166', 'male', '/friends/pulkit-face.jpg'),
  mkFriend(3, 'Ritika', '#7fe7d6', 'female', '/friends/ritika-face.jpg'),
  mkFriend(4, 'Abhishek', '#c77dff', 'male', '/friends/abhishek-face.jpg'),
  mkFriend(5, 'Karan', '#ff9770', 'male', '/friends/karan-face.jpg'),
  mkFriend(6, 'Bhumi', '#8ecae6', 'female', '/friends/bhumi-face.jpg'),
  mkFriend(7, 'Mahak', '#f4a261', 'female', '/friends/mahak-face.jpg'),
  mkFriend(8, 'Abhishek Loblaws', '#b5e48c', 'male', '/friends/abhishek-loblaws-face.jpg'),
  mkFriend(9, 'Rashika', '#ffafcc', 'female'),
  mkFriend(10, 'Adi', '#a0c4ff', 'male'), // guessed -- unisex short name, double-check
  mkFriend(11, 'Nitpreet', '#ffc6ff', 'female', '/friends/nitpreet-face.jpg'), // guessed -- unisex Punjabi name, double-check
  mkFriend(12, 'Zalak', '#caffbf', 'female', '/friends/zalak-face.jpg'),
  mkFriend(13, 'Piyush', '#fdffb6', 'male', '/friends/piyush-face.jpg'),
  mkFriend(14, 'Sara', '#9bf6ff', 'female', '/friends/sara-face.jpg'),
  mkFriend(15, 'Manish', '#bdb2ff', 'male', '/friends/manish-face.jpg'),
  mkFriend(16, 'Manjit', '#ff99c8', 'male', '/friends/manjit-face.jpg'),
  mkFriend(17, 'Disha', '#ffd6a5', 'female', '/friends/disha-face.jpg'),
  mkFriend(18, 'Gurseerut', '#72efdd', 'female', '/friends/gurseerut-face.jpg'), // guessed -- unisex Punjabi name, double-check
  mkFriend(19, 'Jyotirmay', '#ffb4a2', 'male', '/friends/jyotirmay-face.jpg'),
];

function mkFriend(id, name, color, gender, photoSolo = null) {
  return {
    id,
    name,
    photoTogether: null,
    photoSolo,
    color,
    gender,
    message: 'TODO: their birthday message.',
    firstMet: 'TODO: where they first met Akansha.',
    firstImpression: 'TODO: first impression of her.',
    nowImpression: 'TODO: impression of her now.',
    quality: 'TODO: a quality they appreciate about her.',
  };
}

// Shown on the finale screen once the dragon is beaten.
export const finaleNote =
  "TODO: one last message from everyone, all together — to Akansha, from all of us. Happy birthday!";
