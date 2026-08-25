// One entry per level. Fill these in as each friend sends their submission:
//   name           -> their name (shown on the reveal card)
//   photoTogether  -> path to a photo of them + Akansha together, e.g. "/friends/priya-together.jpg"
//   photoSolo      -> path to a solo photo of them, e.g. "/friends/priya-solo.jpg"
//                     (used for the map avatar; leave either photo null to fall back to a colored initial avatar)
//   color          -> placeholder avatar color, used until photos are added
//   message        -> their birthday message to Akansha
//   firstMet       -> where they first met her
//   firstImpression -> their first impression of her
//   nowImpression  -> their impression of her now (can be brutally honest / funny)
//   quality        -> one quality they really like/appreciate about her
//
// Order = level order. Rearrange freely; the game just walks the array in order.

export const friends = [
  mkFriend(1, 'Arpit', '#ff8fab'),
  mkFriend(2, 'Pulkit (Husband)', '#ffd166'),
  mkFriend(3, 'Ritika', '#7fe7d6'),
  mkFriend(4, 'Abhishek', '#c77dff'),
  mkFriend(5, 'Karan', '#ff9770'),
  mkFriend(6, 'Bhumi', '#8ecae6'),
  mkFriend(7, 'Mahak', '#f4a261'),
  mkFriend(8, 'Abhishek Loblaws', '#b5e48c'),
  mkFriend(9, 'Rashika', '#ffafcc'),
  mkFriend(10, 'Adi', '#a0c4ff'),
  mkFriend(11, 'Nitpreet', '#ffc6ff'),
  mkFriend(12, 'Zalak', '#caffbf'),
  mkFriend(13, 'Piyush', '#fdffb6'),
  mkFriend(14, 'Sara', '#9bf6ff'),
  mkFriend(15, 'Manish', '#bdb2ff'),
  mkFriend(16, 'Manjit', '#ff99c8'),
  mkFriend(17, 'Disha', '#ffd6a5'),
  mkFriend(18, 'Gurseerut', '#72efdd'),
  mkFriend(19, 'Jyotirmay', '#ffb4a2'),
];

function mkFriend(id, name, color) {
  return {
    id,
    name,
    photoTogether: null,
    photoSolo: null,
    color,
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
