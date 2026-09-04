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
  mkFriend(1, 'Arpit', '#ff8fab', 'male', '/friends/arpit-face.jpg', {
    photoTogether: '/friends/arpit-together.jpg',
    message: `Happy Birthday Akanshaaa! 🥳❤️
The girl with the biggest heart, the best chai ☕😂, and the only person who will always say yes to drinks! 🍻😂
Always the life of the party — stay exactly the crazy, sweet person you are! ❤️🥂`,
    firstMet: 'Diljit concert.',
    firstImpression: 'Girl knows how to vibe! 😂 And then you went and stole a balloon from a baby… ruthless behaviour 😭😂',
    nowImpression:
      'My impression now is slightly different though — beneath all those cool, sexy-girl vibes is actually the sweetest person with the biggest heart, who always tries to do something special for her friends. ❤️ Plus, I know now she is super terrified of treadmills. 😂',
    quality: 'Her big heart and the effort she puts into making her friends feel special. ❤️',
  }),
  mkFriend(5, 'Karan', '#ff9770', 'male', '/friends/karan-face.jpg', {
    photoTogether: '/friends/karan-together.jpg',
    message: 'Happy Bday Akansha! 🎂🥳 Hope you have an amazing one and a fantastic year ahead! ❤️',
    firstMet: 'Helios launch party.',
    firstImpression: 'Theek hi thi 😂',
    nowImpression: 'Badhiya hai ab 😂',
    quality:
      'I like that she doesn’t keep her thoughts about you to herself. If she thinks something, she’ll just say it straight up — no filter 😂',
  }),
  mkFriend(6, 'Bhumi', '#8ecae6', 'female', '/friends/bhumi-face.jpg', {
    photoTogether: '/friends/bhumi-together.jpg',
    message:
      'You already know this, but I’m telling you again .. love you to the moon and back! ❤️ Happiest Birthday, baby! 🥰 Thank God Karu found you! I genuinely cannot imagine Canada, or my life here, without you. ♥️🤗🥰',
    firstMet:
      'When I met you for the first time, I think we instantly clicked. But when I first saw you, my thought was, “Hi-fi hai, but she is sweet!” 😂❤️',
    firstImpression: 'Hi-fi hai, but she is sweet! 😂❤️',
    nowImpression: `Dominating, but mostly because you dominate our hearts! ❤️
Bossy, but only because you want to boss everyone around and make sure every occasion is extra special! 😂
Moody because you want everything around you done to perfection ! 🥰
And of all the things you are, my favourite is that you are love. ❤️

If there’s one quality I don’t love about you, it’s that you overthink and take everything upon yourself.`,
    quality:
      'The one thing I absolutely LOVE about you is that you can go miles just to make someone feel special. And honestly, that is one of the most beautiful things about you. ❤️',
  }),
  mkFriend(7, 'Mahak', '#f4a261', 'female', '/friends/mahak-face.jpg', {
    photoTogether: '/friends/mahak-together.jpg',
    message: 'Happy Birthday Akansha',
    firstMet: 'Through my Husband',
    firstImpression: 'Same as Abhishek',
    nowImpression: 'Same as Abhishek',
    quality: 'Same as Abhishek',
  }),
  mkFriend(8, 'Abhishek Loblaws', '#b5e48c', 'male', '/friends/abhishek-loblaws-face.jpg', {
    photoTogether: '/friends/abhishek-loblaws-together.jpg',
    message: 'Happy Birthday Akansha',
    firstMet: 'Loblaws',
    firstImpression: 'Same as Mahak',
    nowImpression: 'Same as Mahak',
    quality: 'Same as Mahak',
  }),
  mkFriend(9, 'Rashika', '#ffafcc', 'female', '/friends/rashika-face.jpg', {
    photoTogether: '/friends/rashika-together.jpg',
    message: `Happy birthday to my Akansha ❤️🥹

You’re not just a friend, you’re genuinely my sister, and honestly, I don’t even want to imagine my life without you in it. Like… what would I actually do without you?! Who would I go to for strength, validation, questionable advice, emotional support, gossip and just general life survival?! 😂

Every time I meet you, I swear I leave feeling like I can take on the entire world. You have this insane ability to make me feel stronger and more confident just by existing. And I don’t know if you even realize how much that means to me.

I’m SO glad I met you here because I genuinely feel like the universe knew I needed you in my life. You’re someone I look up to so much — and someone I secretly (not so secretly anymore 😂) want to become like. You’re bold, sexy, intimidating, confident, unapologetic and just so effortlessly YOU. The way you walk into a room like you own the place? The attitude? The confidence? The “I said what I said” energy?! I LOVE IT. 😂😭

You’re the kind of woman who makes other women feel like they can be bigger, louder and more unapologetically themselves, and I hope you know how special that is. You inspire me more than you probably realize.

And while I absolutely adore you, I also need you to know that you’re slightly insane and probably responsible for at least 50% of my questionable life choices. 😂 But honestly, I wouldn’t have it any other way.

I love you SO fucking much. ❤️ I’m beyond grateful that life brought you into mine, and I hope we get to grow old together, continue being chaotic, laughing until our stomachs hurt, hyping each other up, oversharing everything and annoying everyone around us. 😂

Here’s to you, to us, to all the memories we’ve already made and to MANY, MANY more years of this ridiculous sisterhood. 🥂❤️

Happy birthday, my girl. I love you more than words can explain`,
    firstMet: 'Delhi',
    firstImpression:
      'I just remember thinking, “Hmm… she seems cool, but I’m going to observe from a safe distance first.” 😂 You had this very confident, slightly intimidating energy and I genuinely couldn’t tell if you were going to be my best friend or silently judge me.',
    nowImpression: 'Wouldn’t trade her for anything💕 jk, maybe for a million dollars 🤣',
    quality:
      'Her confidence and how unapologetically herself she is. She has this ability to walk into a room and completely own it, and I genuinely admire that about her. She makes the people around her feel stronger just by being hers',
  }),
  mkFriend(10, 'Adi', '#a0c4ff', 'male', '/friends/adi-face.jpg', {
    // guessed -- unisex short name, double-check
    photoTogether: '/friends/adi-together.jpg',
    message:
      'Happy Birthday, Akansha! 🥳🎂❤️ It’s funny to think that I first met you when you were just Kashish’s roommate in Delhi, and somehow you ended up becoming such a good friend. Really glad that random introduction turned into a friendship. Hope you have an amazing birthday and an even better year ahead. Stay your crazy, fun, caring self. Wishing you lots of happiness, success, and good memories. Have the best one! ❤️🥂',
    firstMet: 'I first met Akansha at her place in Delhi when she was Kashish’s roommate.',
    firstImpression:
      'My first impression was that she was really friendly, easygoing, and pretty fun to be around. She seemed like someone who could easily get along with people.',
    nowImpression:
      'Now I know she’s definitely a lot more caring, opinionated, and has absolutely no problem telling you exactly what she thinks. But honestly, that’s part of what makes her such a good friend.',
    quality:
      'I really appreciate how genuine and caring she is. Once she considers you a friend, she genuinely cares about you and is always there when it matters.',
  }),
  mkFriend(14, 'Sara', '#9bf6ff', 'female', '/friends/sara-face.jpg', {
    photoTogether: '/friends/sara-together.jpg',
    message: `Happy Birthday, Akansha! 🎉❤️
You are like a big sister to me. I feel such a strong connection with you, and whenever I’m with you, it feels like I’ve known you for ages. I truly admire you, your dressing sense, your confidence, and the way you speak.

What I love most about you is that whenever I’m with you, I feel completely at home. Our gossip sessions about our saas 😂 are always so much fun because we both relate to each other so well.

I really want you to always be a part of my life because you are such a wonderful person, and I love you dearly. I hope you have the most amazing birthday celebration in Italy and make beautiful memories.🥳🎂🇮🇹❤️`,
    firstMet: 'Virtually, we’ve spent time together over video calls, but I met her in person for the first time when I landed in Canada. ❤️',
    firstImpression: 'partyholic and bakchood',
    nowImpression: 'You’re getting smarter day by day, and you’re looking prettier than ever in your sweet 30s! ❤️✨',
    quality: 'Your confidence',
  }),
  mkFriend(15, 'Manish', '#bdb2ff', 'male', '/friends/manish-face.jpg', {
    photoTogether: '/friends/manish-together.jpg',
    message: `Happy birthday Akansha! 🎂

From Montreal to living together at 1645 to now both ending up in Toronto. Funny how life just worked out that way.
You’ve genuinely been one of the most consistent people in my life through all these years and changes. And of course our little tradition. You calling around 10:30-11 asking us to just come meet for an hour and somehow it always turns into two. Never fails never gets old😂
Wish I could be there to celebrate with you but sounds like Italy is doing a pretty great job of it instead! Have the most amazing birthday. Soak it all in and come back with stories😬
Love you lots Akansha. Here’s to many many more years of friendship💛`,
    firstMet: 'We met at her Airbnb in Montreal, she was quarantining there.',
    firstImpression:
      'Honestly, my first impression was typical South Delhi girl energy 😂 She was on a work call, basically giving Pulkit orders left and right, very much in boss mode. I remember thinking she’s clearly someone who knows how to take charge.',
    nowImpression:
      'Turns out that bossy energy never really left 😂 but now it’s mixed with being one of the sweetest, most caring people I know. She’ll still boss you around one minute and then show up for you without a second thought the next.',
    quality:
      'Her focus is unmatched. Work, decorating her home, or just figuring people out, she always knows exactly what she’s doing and somehow pulls the best out of everyone around her.',
  }),
  mkFriend(18, 'Gurseerut', '#72efdd', 'female', '/friends/gurseerut-face.jpg', {
    // guessed -- unisex Punjabi name, double-check
    photoTogether: '/friends/gurseerut-together.jpg',
    message: `Happy Birthday to my Akansha! ❤️🥹

Who knew the person I met because of Pulkit would become such a special friend to me? 😂❤️ You’re bossy, dramatic and impossible to reach sometimes 😭😂, but behind all that attitude is one of the sweetest and warmest hearts.

I love how you bring everyone together, include everyone and always make people feel loved. And the way you love me and my jyoti means so much to me. 🥹❤️

I’m just waiting for the day we finally live in the same city and make all those plans we’ve been talking about forever! 😂

Love you loads, boss lady! 👑❤️ Happy Birthday`,
    firstMet:
      'Technically, I first met Akansha when I came to Montreal for the first time in 2021. But honestly, I feel like I knew her even before we met face-to-face. She used to send me pictures of herself and everyone, and somehow we became friends through texts and calls before actually meeting. 😂 We would already be talking about meeting, partying and saying, “See you super soon, come fast!” So by the time we finally met, it didn’t really feel like meeting someone for the first time, it felt like finally meeting a friend I know for years',
    firstImpression:
      'I’ve always loved you in your own natural way. ❤️ Even before meeting you, I could feel that warmth through your texts and calls, and when we finally met face-to-face, it was exactly the same. You have such a naturally nice and welcoming personality. I especially love how you include everyone in your plans and make an effort to bring people together. You just have this warmth that makes people feel comfortable around',
    nowImpression: `Honestly, after so many years, the love has only increased and so has the warmth. ❤️ You’re still the same person at heart, but knowing you for longer has made me appreciate you even more.

And yes, even though you don’t pick up my calls at first place and sometimes take approximately 48 business hours to reply to my texts 😭😂, I still love you because you’re genuinely one of those people who are meant to be loved forever🥹`,
    quality: `I really admire how naturally bossy you are. 😂 You have this quality of taking initiative and making things happen instead of just sitting around waiting for someone else to do it. Whether something turns out good or bad, you own it, learn from it and always try to do better. You genuinely give your best in whatever you do, and I admire that about you.

And I especially love how your bossiness somehow comes with a lot of care- you’re always trying to bring people together, make plans happen and make sure everyone is included. ❤️`,
  }),
  mkFriend(19, 'Jyotirmay', '#ffb4a2', 'male', '/friends/jyotirmay-face.jpg', {
    photoTogether: '/friends/jyotirmay-together.jpg',
    message: 'HBD Akangsha',
    firstMet: 'Nitpreet ke ghar pe',
    firstImpression: 'ये दीदी कौन हैं?',
    nowImpression: 'ये दीदी कौन हैं?',
    quality: 'Refers me to jobs',
  }),
  mkFriend(12, 'Zalak', '#caffbf', 'female', '/friends/zalak-face.jpg', {
    photoTogether: '/friends/zalak-together.jpg',
    message: `Happy Birthday, CEO! 👑🎂

May you continue conquering the world with your courageous spirit, confidence, and that “I know what I’m doing” attitude, even when absolutely nobody knows what’s going on. 😂 Stay happy, healthy, crazy, and exactly the same… because honestly, the world already has enough boring people! ❤️

And Montreal… where do I even begin? ❤️
From our legendary 1645 meetups, to drunk nights and absolutely questionable dance moves 💃🍻, cycling around different places, going on random adventures, and making amazing trip plans… only to execute them in a completely different way than planned. 🤣

From taking a heart patient to hike on the black ice of Mount Royal in the middle of the winter night, to doing every stupid thing imaginable, our Montreal adventures were never short on chaos. And somehow, you even managed to cry over a torn-apart Aldo bag like it was a national tragedy. 😂👜

Here’s to more questionable decisions, endless conversations, terrific dance moves, crazy adventures, and memories that we’ll probably laugh about for years! 🥂

Stay the same crazy, caring, and entertaining person you are. Life is definitely more fun with you in it! Happy Birthday, once again! God bless you. ❤️✨`,
    firstMet: '1411 Rue du Fort, Montreal.',
    firstImpression: `Honestly? I thought she had A LOT of attitude.

But then I found out she was from Delhi and suddenly everything made sense. 😂 Fast forward to today… and I can confidently say that first impression was very much accurate.

Just joking. 😜 She is probably one of the most friendly people I know - always getting along with everyone, making people feel comfortable, talking nonstop, and bringing her own unique energy wherever she goes. 😂

In fact, even after getting a challan, she had the audacity to ask, “Does the middle seat of the car even have a seat belt?” 🤣`,
    nowImpression: `She is probably one of the most friendly people I know - always getting along with everyone, making people feel comfortable, talking nonstop, and bringing her own unique energy wherever she goes. 😂

From our legendary 1645 meetups, to drunk nights and absolutely questionable dance moves 💃🍻, cycling around different places, going on random adventures, and making amazing trip plans… only to execute them in a completely different way than planned. 🤣`,
    quality: 'Always a vibe, always full of life, and my forever dance partner 💃',
  }),
  mkFriend(13, 'Piyush', '#fdffb6', 'male', '/friends/piyush-face.jpg', {
    photoTogether: '/friends/piyush-together.jpg',
    message: `🎂😂 Happy Birthday Akansha! 😂🎂

First of all, stay healthy, keep travelling, mast ghumo-firo, duniya explore karo 🌎✈️ and enjoy life to the fullest!

Keep smiling, keep dancing, keep irritating everyone around you, and most importantly, keep being the same pagal Akansha! ❤️

So once again, Happy Birthday Akansha! 🥳❤️

Stay happy, stay crazy, keep travelling, keep dancing, keep smiling… and please, iss saal challan thoda kam lena. 🤣

Have an amazing birthday and an even more amazing year ahead! ❤️🎂🥳`,
    firstMet: `Montreal! 🇨🇦

Akansha was actually one of the first people who made me feel comfortable in Canada. She kept reassuring me, “Canada badhiya hai, sab mast hai idhar, home sick hone ki zarurat nahi hai.” 😂

She was always concerned about whether I was doing okay and kept asking, “Kuch chahiye? Sab theek hai?”

Basically, Montreal mein meri unofficial Canadian customer-care representative thi. 😂😂`,
    firstImpression: `Sweet, comforting and caring… BUT 😛

She used to make faces at my non-veg jokes. 😂
Fortunately, mereko kya hi farak padna tha… mere saath Manjit aur Nitpreet the. 🤣

She was also the first person I saw eating only the corner part of a pizza. 🍕😂
Aaj tak samajh nahi aaya pizza ka corner hi kyun… pizza ke saath bhi discrimination! 🤣

And then there was the legendary Kamli Kamli dance. 💃
Honestly, best Kamli Kamli performance I’ve ever seen after Katrina Kaif. 😛😂

And of course, how can I forget — the unluckiest person in the group.
Jahan jaati hai, challan leke wapas aati hai. 🤣🚗💸
Challan inspector probably sees her coming and starts celebrating. 😂`,
    nowImpression: `Ab toh Akansha is a completely different level of character. 😂

World explore kar rahi hai 🌎, life ko full enjoy kar rahi hai, aur drink ke baad toh alag hi software version activate ho jaata hai. 🤣💃

Full-on dance, masti and entertainment!

Kabhi-kabhi meri sutta partner bhi ban jaati hai. 😛

But honestly, jokes apart, it’s been really nice seeing her journey from Montreal to Toronto and seeing how much she has grown and how much she’s enjoying life. ❤️

From the girl telling me “Canada mein sab mast hai” to now khud Canada mein mast life jee rahi hai. 😂❤️`,
    quality: `She always stands up for her friends. Whenever someone needs her, she’s supportive and genuinely there for them. ❤️

And obviously… GREAT DANCER! 💃😂`,
  }),
  mkFriend(3, 'Ritika', '#7fe7d6', 'female', '/friends/ritika-face.jpg', {
    photoTogether: '/friends/ritika-together.jpg',
    message: `Happy birthday, Baby! ❤️ I hope you always know how loved and appreciated you are. You’re genuinely one of those people who makes life better just by being in it.

I absolutely adore what we have, and honestly, how desperate I get when I don’t get to meet you every week should be enough proof of that 😂

I love you exactly the way you are - bold, caring, and a little crazy. Never lose the charisma you carry everywhere you go.

Happy birthday once again, my girl. 😘`,
    firstMet: 'Delhi Airport, when we were travelling to Canada.',
    firstImpression:
      'Rude and arrogant 😂 And continuing the same airport energy… honestly, our first interaction was not a very pleasant one 😂 But somewhere between our not-so-great first interaction and everything that came after, I found one of my favourite people. ❤️',
    nowImpression:
      'Toronto is not home without her. ❤️ She has become such an important part of my life here. I couldn’t have asked for a better version of Akansha. She’s one of those people I know I can always count on, and I’m so grateful for our friendship.',
    quality:
      'Her brutal honesty. She says what she thinks and owns it. Even when everyone else is thinking the same thing but nobody wants to say it, she’ll be the one to say it 😂 And I really admire that about her. Also, not to forget, her high moral ground never changes with situations - iykyk 😉',
  }),
  mkFriend(4, 'Abhishek', '#c77dff', 'male', '/friends/abhishek-face.jpg', {
    photoTogether: '/friends/abhishek-together.jpg',
    message: `Happy birthday babe. May god shower you with all the happiness, love and multiple europe trips like this in your life.
So lucky to have you as my partner in crime(literally).
Stay free and stay wild.
Cheers to many more to come🥂 😘❤️`,
    firstMet: 'At Raju bhai’s birthday when our cut our “Roka cakes” together[Typical thing at Raju’s event] and then later bonded over sutta 🚬',
    firstImpression:
      'So loving and welcoming. I was so relieved to see Ritika had such warm and caring friends who I can talk freely to and relate about my life experiences without any judgement.',
    nowImpression: `Akansha to me now is like a girl next door who’s living her life as simple as can she can while living in a Imtiaz Ali movie.
Anyone who calls her friend is so lucky and grateful to have her.
Bss gaand thodi kamm maare to bhi chlega.
Baki Raj Shamani rocks 🤘`,
    quality: 'She’s always one for her homies. No matter what, you know you could count on her; basically chutiya cheezon main bhi support krti hai😝',
  }),
  mkFriend(17, 'Disha', '#ffd6a5', 'female', '/friends/disha-face.jpg', {
    photoTogether: '/friends/disha-together.jpg',
    message: 'Aditi to my Naina, Allie to my Hannah ❤️\nI\'d choose you always. Every version of you !\nLove you always. Happy Birthday Aks 🎂',
    firstMet: 'undergrad (its been 11 years !!)',
    firstImpression: 'def not my vibe',
    nowImpression: 'still very diff but just love her for all those differences',
    quality:
      "How you love wholeheartedly and is ready to fight for those you love. How you always try to bring everyone together, and bring fun in everyone's lives",
  }),
  mkFriend(11, 'Nitpreet', '#ffc6ff', 'female', '/friends/nitpreet-face.jpg', {
    // guessed -- unisex Punjabi name, double-check
    photoTogether: '/friends/nitpreet-together.jpg',
    message: `Happy birthday Akansha❤️
You’re a friend that I think no one deserves😒😒…..
Because if everyone were getting this level of friends then we’d never understand how good a friend you’re to us, and we would lose the exclusivity. I sometimes miss our bakchodi Montreal time together and really cherish the great time we had in Montreal. The day you left for Toronto, Montreal stopped feeling like home for me — it felt like settling in the city all over again.

But no matter where life takes you, I’ll be by your side through it all. Keep doing bakchodi and keep organizing our summer calendars — for our lifetime ❤️. Happy birthday moti once again❤️❤️`,
    firstMet: 'We met first time outside her best friend’s (Manish) home',
    firstImpression: 'Not gonna lie, my first impression was straight-up mean girl / bitch energy 😂.',
    nowImpression:
      'Turns out she’s basically a certified mimicry artist 😂 full bakchodi mode, doing impressions of literally everything — humans, animals, whatever’s in front of her. Zero warning, maximum chaos.',
    quality:
      'How much effort she puts into caring for the people she loves. It’s not just a one-time thing — she actually keeps showing up for it consistently.',
  }),
  mkFriend(16, 'Manjit', '#ff99c8', 'male', '/friends/manjit-face.jpg', {
    photoTogether: '/friends/manjit-together.jpg',
    message: `Happy Birthday to my favourite situational comedian, professional overthinker, and the only person I know who can have a full-blown emotional crisis over her sofa and carpet getting dirty. 😂

I hope Europe is living up to your expectations… although, wait, nothing probably ever can. Your expectations are somewhere between perfection and standing next to God. 😂😂

Jokes apart, I genuinely wish you a life filled with good health, happiness, success, and all the beautiful things you deserve. I’m really lucky to have you as a friend, and I hope I get to annoy you, laugh with you, and be a part of your life for many, many years to come.

Stay exactly the way you are: dramatic, hilarious, particular, and absolutely impossible to replace.

Happy Birthday, Akansha! 🥂`,
    firstMet: 'I met you first at 1411 Montreal. I remember we just said hi and that’s it.',
    firstImpression: 'She gave a full mean girl energy like “Don’t fuck with me.” 😂',
    nowImpression: 'Mean girl energy and “Don’t fuck with me” 😂 — but caring, loving, and always standing up for me.',
    quality: 'Her intellect and her ability to understand complex human emotions and predicaments.',
  }),
  mkFriend(2, 'Pulkit (Husband)', '#ffd166', 'male', '/friends/pulkit-face.jpg', {
    photoTogether: '/friends/pulkit-together.jpg',
    message: `Happy Birthday, my love ❤️! It has been a long time since we met yet it just feels like yesterday. We practically have spent 1/3rd of our lives together.

I hope you know how special you are to me. You are my wife, best friend and most importantly my time manager. I often say god plans things for me and in that, I have heard people saying you are the best planner and I am a bit of an atheist 🥹🤪.

Wishing you the happiest birthday love, and I might not say it enough but I am so proud and lucky that I have Shubhi in my life (Vaccum Robot).`,
    firstMet:
      'I was organizing a Hackathon in college and I asked “Shoot” to get me some “volunteers”, After some negotiations, he agreed to “help” with 3 volunteers 🤪, Akansha was one of them.',
    firstImpression: `Honestly, I first time noticed her over a phone call. It was a busy time in college and I was very sick.

At that point she was the only one who actually called me to not get an update on “what’s the status of event timelines etc” but rather just asked about me. That’s when I realised, she acts tough but deep down really cares a lot. She is fearless, would do anything to help and more than everything she brings out your fun side.`,
    nowImpression:
      'She now asks me “what’s the status of event timelines”, assigns me tasks, so I am not sure if my original impression still holds 😭. But jokes apart, she is fierce, opinionated but more importantly always caring for her own people.',
    quality:
      'I really like how she fights for her own people. She would do anything for them. She is brave, yet warm. Hot headed but open to broad opinions. Loving yet blunt.',
  }),
];

function mkFriend(id, name, color, gender, photoSolo = null, extra = {}) {
  return {
    id,
    name,
    photoTogether: extra.photoTogether ?? null,
    photoSolo,
    color,
    gender,
    message: extra.message ?? 'TODO: their birthday message.',
    firstMet: extra.firstMet ?? 'TODO: where they first met Akansha.',
    firstImpression: extra.firstImpression ?? 'TODO: first impression of her.',
    nowImpression: extra.nowImpression ?? 'TODO: impression of her now.',
    quality: extra.quality ?? 'TODO: a quality they appreciate about her.',
  };
}

// Shown on the finale screen once the dragon is beaten -- also what a
// revisit of the already-defeated dragon shows (see "View Messages" in the
// replay modal), since that path skips the one-time rescue pop-up in main.js.
export const finaleNote = `Akansha, we did it. ❤️

We sacrificed our sweat, blood, sanity, and probably several brain cells to save you. 😂

We fought through monsters. We battled our way through the kingdom. And finally… we defeated the dragon. 🐉⚔️

All of this… just for you. ❤️

Because we love you. We care about you. And, unfortunately for you, you're stuck with us forever. 😂❤️

Stay in our lives forever.

Happy Birthday, Akansha! 🎂🥂❤️

— Your slightly insane but extremely loyal friends`;
