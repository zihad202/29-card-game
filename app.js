"use strict";

/*
=========================================================
29 CARD GAME
=========================================================

4 Player Local Prototype

CARD ORDER:
J > 9 > A > 10 > K > Q > 8 > 7

CARD POINTS:
J  = 3
9  = 2
A  = 1
10 = 1
Others = 0

TOTAL CARD POINTS = 28

BIDDING SYSTEM:
---------------------------------------------------------
Bidding can start from ANY player.

Example if P1 starts:

P1 -> P2
     DUEL
       ↓
Winner -> P3
          DUEL
            ↓
Winner -> P4
          DUEL
            ↓
Final Winner
            ↓
Trump Selection

Every bid must be higher than the previous bid.

If a player passes:
- Current duel ends.
- The other player becomes duel winner.
- Duel winner challenges next clockwise player.

After all 4 players have received a bidding opportunity:
- Bidding ends.
- Highest bidder selects trump.

TRICK RULES:
---------------------------------------------------------
- Follow suit is mandatory.
- If player has no lead suit:
  - They may discard without showing trump.
  - They may show trump.
  - If they show trump and have trump,
    they MUST play trump.
- Trump beats all non-trump cards.

SCORING:
---------------------------------------------------------
Successful contract:
  Bidder team +1
  Opponent team -1

Failed contract:
  Bidder team -1
  Opponent team +1

MATCH:
---------------------------------------------------------
First team to reach +6 wins.
=========================================================
*/


/* =========================================================
   CONSTANTS
========================================================= */

const SUITS = [
  "hearts",
  "diamonds",
  "clubs",
  "spades"
];

const SUIT_SYMBOL = {
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
  spades: "♠"
};

const SUIT_NAME = {
  hearts: "Hearts",
  diamonds: "Diamonds",
  clubs: "Clubs",
  spades: "Spades"
};


/*
  Weak -> Strong
*/

const RANKS = [
  "7",
  "8",
  "Q",
  "K",
  "10",
  "A",
  "9",
  "J"
];


const RANK_VALUE = {

  "7": 1,
  "8": 2,
  "Q": 3,
  "K": 4,
  "10": 5,
  "A": 6,
  "9": 7,
  "J": 8

};


const CARD_POINTS = {

  "7": 0,
  "8": 0,
  "Q": 0,
  "K": 0,
  "10": 1,
  "A": 1,
  "9": 2,
  "J": 3

};


const MIN_BID = 16;
const MAX_BID = 28;


const PLAYER_NAMES = [
  "Player 1",
  "Player 2",
  "Player 3",
  "Player 4"
];


/* =========================================================
   GAME STATE
========================================================= */

const game = {

  started: false,

  phase: "idle",

  players: [

    {
      id: 0,
      name: PLAYER_NAMES[0],
      team: "A",
      hand: [],
      captured: []
    },

    {
      id: 1,
      name: PLAYER_NAMES[1],
      team: "B",
      hand: [],
      captured: []
    },

    {
      id: 2,
      name: PLAYER_NAMES[2],
      team: "A",
      hand: [],
      captured: []
    },

    {
      id: 3,
      name: PLAYER_NAMES[3],
      team: "B",
      hand: [],
      captured: []
    }

  ],


  deck: [],


  dealer: 0,


  /*
    Player who starts bidding.
  */

  biddingStarter: 1,


  /*
    Current highest bid.
  */

  currentBid: null,


  /*
    Current duel winner.
  */

  highestBidder: null,


  /*
    Player currently challenging
    the highest bidder.
  */

  biddingOpponent: null,


  /*
    Current player whose action is required.
  */

  biddingTurn: null,


  /*
    Players who have already finished
    their challenge opportunity.
  */

  passedPlayers: new Set(),


  trumpSuit: null,

  trumpRevealed: false,

  trumpSelectionPlayer: null,


  marriage: null,

  effectiveBid: null,


  leadPlayer: null,

  currentTurn: null,

  leadSuit: null,


  trickCards: [],

  trickNumber: 0,


  teamScore: {
    A: 0,
    B: 0
  },


  trickPoints: {
    A: 0,
    B: 0
  },


  handNumber: 0,

  matchOver: false

};


/* =========================================================
   DOM
========================================================= */

const $ = (id) => document.getElementById(id);


const startButton = $("startButton");

const startPanel = $("startPanel");

const biddingPanel = $("biddingPanel");

const trumpPanel = $("trumpPanel");

const trumpShowPanel = $("trumpShowPanel");

const playerHand = $("playerHand");

const gameStatus = $("gameStatus");

const globalMessage = $("globalMessage");

const turnMessage = $("turnMessage");


/* =========================================================
   BASIC HELPERS
========================================================= */

function nextPlayer(playerIndex) {

  return (playerIndex + 1) % 4;

}


function previousPlayer(playerIndex) {

  return (playerIndex + 3) % 4;

}


function getTeam(playerIndex) {

  return game.players[playerIndex].team;

}


function getPlayerName(playerIndex) {

  return game.players[playerIndex].name;

}


function sleep(ms) {

  return new Promise(resolve => setTimeout(resolve, ms));

}


/* =========================================================
   DECK
========================================================= */

function createDeck() {

  const deck = [];


  for (const suit of SUITS) {

    for (const rank of RANKS) {

      deck.push({

        id: `${suit}-${rank}`,

        suit,

        rank,

        points: CARD_POINTS[rank]

      });

    }

  }


  return deck;

}


function shuffle(deck) {

  const arr = [...deck];


  for (
    let i = arr.length - 1;
    i > 0;
    i--
  ) {

    const j =
      Math.floor(Math.random() * (i + 1));


    [
      arr[i],
      arr[j]
    ] = [
      arr[j],
      arr[i]
    ];

  }


  return arr;

}


/* =========================================================
   START GAME
========================================================= */

function startGame() {

  game.started = true;

  game.matchOver = false;


  game.teamScore.A = 0;
  game.teamScore.B = 0;


  game.dealer =
    Math.floor(Math.random() * 4);


  game.handNumber = 0;


  startPanel.classList.add("hidden");


  startNewHand();

}


/* =========================================================
   START NEW HAND
========================================================= */

function startNewHand() {

  if (game.matchOver) {

    return;

  }


  game.handNumber++;


  game.phase = "dealing";


  game.deck =
    shuffle(createDeck());


  /*
    Reset bidding
  */

  game.currentBid = null;

  game.highestBidder = null;

  game.biddingTurn = null;

  game.biddingOpponent = null;

  game.passedPlayers =
    new Set();


  /*
    Reset trump
  */

  game.trumpSuit = null;

  game.trumpRevealed = false;

  game.trumpSelectionPlayer = null;


  /*
    Reset marriage
  */

  game.marriage = null;

  game.effectiveBid = null;


  /*
    Reset trick
  */

  game.leadPlayer = null;

  game.currentTurn = null;

  game.leadSuit = null;

  game.trickCards = [];

  game.trickNumber = 0;


  /*
    Reset trick points
  */

  game.trickPoints.A = 0;

  game.trickPoints.B = 0;


  /*
    Clear hands
  */

  for (const player of game.players) {

    player.hand = [];

    player.captured = [];

  }


  /*
    Rotate dealer after first hand.
  */

  if (game.handNumber > 1) {

    game.dealer =
      nextPlayer(game.dealer);

  }


  /*
    Bidding starts clockwise
    from dealer.
  */

  game.biddingStarter =
    nextPlayer(game.dealer);


  /*
    First 4 cards.
  */

  dealCards(4);


  /*
    Start bidding.
  */

  game.phase = "bidding";

  game.biddingTurn =
    game.biddingStarter;


  updateUI();

}


/* =========================================================
   DEAL CARDS
========================================================= */

function dealCards(numberEach) {

  for (
    let i = 0;
    i < numberEach;
    i++
  ) {

    for (
      let p = 0;
      p < 4;
      p++
    ) {

      const card =
        game.deck.pop();


      if (card) {

        game.players[p].hand.push(card);

      }

    }

  }

}


/* =========================================================
   BIDDING
========================================================= */

/*
=========================================================
IMPORTANT BIDDING LOGIC
=========================================================

Suppose P1 starts:

P1 opens 16
P2 challenges 17

Now duel:

P1 18
P2 19
P1 20
P2 PASS

P2 wins the duel.

Now P2 goes to P3:

P3 21
P2 22
P3 PASS

P2 wins again.

Now P2 goes to P4:

P4 23
P2 24
P4 PASS

P2 is FINAL WINNER.

Then P2 selects trump.

The exact same logic works no matter
which player starts.
=========================================================
*/


function submitBid() {

  if (game.phase !== "bidding") {

    return;

  }


  const player =
    game.biddingTurn;


  const input =
    $("bidInput");


  const value =
    Number(input.value);


  /*
    Validate number
  */

  if (!Number.isInteger(value)) {

    showMessage(
      "Enter a valid bid."
    );

    return;

  }


  /* =====================================================
     OPENING BID
  ===================================================== */

  if (game.currentBid === null) {

    /*
      Only bidding starter can open.
    */

    if (
      player !== game.biddingStarter
    ) {

      showMessage(
        "Invalid bidding state."
      );

      return;

    }


    /*
      Opening bid must be 16-28.
    */

    if (
      value < MIN_BID ||
      value > MAX_BID
    ) {

      showMessage(
        `First bid must be between ${MIN_BID} and ${MAX_BID}.`
      );

      return;

    }


    /*
      Save opening bid.
    */

    game.currentBid = value;

    game.highestBidder = player;


    /*
      Next clockwise player
      becomes challenger.
    */

    game.biddingOpponent =
      nextPlayer(player);


    game.biddingTurn =
      game.biddingOpponent;


    input.value = "";


    showMessage(
      `${getPlayerName(game.biddingOpponent)} is challenging ${getPlayerName(player)}.`
    );


    updateUI();

    return;

  }


  /* =====================================================
     DUEL
  ===================================================== */

  const winner =
    game.highestBidder;


  const challenger =
    game.biddingOpponent;


  /*
    Safety check.
  */

  if (
    player !== winner &&
    player !== challenger
  ) {

    showMessage(
      "Invalid bidding turn."
    );

    return;

  }


  /* =====================================================
     CHALLENGER BIDS
  ===================================================== */

  if (
    player === challenger
  ) {

    /*
      Every new bid MUST be higher.
    */

    if (
      value <= game.currentBid
    ) {

      showMessage(
        `Bid must be higher than ${game.currentBid}.`
      );

      return;

    }


    if (
      value > MAX_BID
    ) {

      showMessage(
        `Maximum bid is ${MAX_BID}.`
      );

      return;

    }


    /*
      Challenger becomes temporary winner.
    */

    game.currentBid =
      value;


    game.highestBidder =
      challenger;


    /*
      Previous winner becomes challenger.
    */

    game.biddingOpponent =
      winner;


    game.biddingTurn =
      winner;


    input.value = "";


    updateUI();

    return;

  }


  /* =====================================================
     CURRENT WINNER BIDS
  ===================================================== */

  if (
    player === winner
  ) {

    /*
      Winner also MUST bid higher.

      Equal bid is not allowed.
    */

    if (
      value <= game.currentBid
    ) {

      showMessage(
        `Bid must be higher than ${game.currentBid}.`
      );

      return;

    }


    if (
      value > MAX_BID
    ) {

      showMessage(
        `Maximum bid is ${MAX_BID}.`
      );

      return;

    }


    /*
      Winner keeps the lead.
    */

    game.currentBid =
      value;


    game.highestBidder =
      winner;


    /*
      Challenger gets next turn.
    */

    game.biddingTurn =
      challenger;


    input.value = "";


    updateUI();

    return;

  }

}


/* =========================================================
   PASS
========================================================= */

function submitPass() {

  if (game.phase !== "bidding") {

    return;

  }


  const player =
    game.biddingTurn;


  /*
    First bidder cannot pass before
    making the opening bid.
  */

  if (
    game.currentBid === null
  ) {

    showMessage(
      "The first bidder must make the opening bid."
    );

    return;

  }


  const winner =
    game.highestBidder;


  const challenger =
    game.biddingOpponent;


  /*
    Safety check.
  */

  if (
    player !== winner &&
    player !== challenger
  ) {

    showMessage(
      "Invalid bidding turn."
    );

    return;

  }


  /* =====================================================
     CHALLENGER PASSES
  ===================================================== */

  if (
    player === challenger
  ) {

    /*
      Challenger loses this duel.

      Current winner survives.

      IMPORTANT:
      The winner now moves to the NEXT
      clockwise player.
    */


    game.passedPlayers.add(
      challenger
    );


    const nextOpponent =
      nextPlayer(winner);


    /*
      Has the winner already reached
      the original bidding starter?

      If yes, every player has already
      received a challenge opportunity.

      Bidding is finished.
    */

    if (
      nextOpponent === game.biddingStarter
    ) {

      finishBidding();

      return;

    }


    /*
      New duel:

      Winner vs next clockwise player
    */

    game.biddingOpponent =
      nextOpponent;


    game.biddingTurn =
      nextOpponent;


    showMessage(
      `${getPlayerName(winner)} won the duel. Now ${getPlayerName(nextOpponent)} challenges.`
    );


    updateUI();

    return;

  }


  /* =====================================================
     CURRENT WINNER PASSES
  ===================================================== */

  if (
    player === winner
  ) {

    /*
      Winner gives up the duel.

      Challenger becomes new winner.
    */

    game.passedPlayers.add(
      winner
    );


    game.highestBidder =
      challenger;


    /*
      New winner now moves clockwise.
    */

    const nextOpponent =
      nextPlayer(challenger);


    /*
      If we have returned to the
      original bidding starter,
      everyone has had their opportunity.
    */

    if (
      nextOpponent === game.biddingStarter
    ) {

      finishBidding();

      return;

    }


    /*
      New duel:

      New Winner vs Next Player
    */

    game.biddingOpponent =
      nextOpponent;


    game.biddingTurn =
      nextOpponent;


    showMessage(
      `${getPlayerName(challenger)} won the duel. Now ${getPlayerName(nextOpponent)} challenges.`
    );


    updateUI();

    return;

  }

}


/* =========================================================
   FINISH BIDDING
========================================================= */

function finishBidding() {

  if (
    game.highestBidder === null
  ) {

    showMessage(
      "No valid bid was made."
    );

    return;

  }


  /*
    Bidding is now completely finished.
  */

  game.phase = "trump";


  /*
    Final highest bidder selects trump.
  */

  game.trumpSelectionPlayer =
    game.highestBidder;


  showMessage(
    `${getPlayerName(game.highestBidder)} won the bidding and must select trump.`
  );


  updateUI();

}


/* =========================================================
   SELECT TRUMP
========================================================= */

function selectTrump(suit) {

  if (
    game.phase !== "trump"
  ) {

    return;

  }


  if (
    game.trumpSelectionPlayer === null
  ) {

    return;

  }


  if (
    !SUITS.includes(suit)
  ) {

    return;

  }


  game.trumpSuit =
    suit;


  /*
    Trump remains hidden.
  */

  game.trumpRevealed =
    false;


  /*
    Deal remaining 4 cards.
  */

  dealCards(4);


  /*
    First trick starts from
    bidding starter.
  */

  game.leadPlayer =
    game.biddingStarter;


  game.currentTurn =
    game.leadPlayer;


  game.phase =
    "playing";


  showMessage(
    `${getPlayerName(game.trumpSelectionPlayer)} selected a hidden trump.`
  );


  updateUI();

}


/* =========================================================
   CARD LEGALITY
========================================================= */

function hasSuit(
  playerIndex,
  suit
) {

  return game.players[playerIndex]
    .hand
    .some(
      card => card.suit === suit
    );

}


function getPlayableCards(
  playerIndex
) {

  const player =
    game.players[playerIndex];


  /*
    First card of trick.
  */

  if (!game.leadSuit) {

    return [...player.hand];

  }


  /*
    Player has lead suit.
  */

  const matchingSuit =
    player.hand.filter(
      card =>
        card.suit === game.leadSuit
    );


  if (
    matchingSuit.length > 0
  ) {

    return matchingSuit;

  }


  /*
    Player has no lead suit.

    They may discard,
    or show trump.
  */

  return [...player.hand];

}


/* =========================================================
   PLAY CARD REQUEST
========================================================= */

function attemptPlayCard(
  cardId
) {

  if (
    game.phase !== "playing"
  ) {

    return;

  }


  const playerIndex =
    game.currentTurn;


  const player =
    game.players[playerIndex];


  const cardIndex =
    player.hand.findIndex(
      card => card.id === cardId
    );


  if (
    cardIndex === -1
  ) {

    showMessage(
      "That card is not in this player's hand."
    );

    return;

  }


  const card =
    player.hand[cardIndex];


  /*
    Follow suit is mandatory.
  */

  if (
    game.leadSuit &&
    card.suit !== game.leadSuit &&
    hasSuit(
      playerIndex,
      game.leadSuit
    )
  ) {

    showMessage(
      `You must follow ${SUIT_NAME[game.leadSuit]}.`
    );

    return;

  }


  playCard(
    playerIndex,
    card
  );

}


/* =========================================================
   PLAY CARD
========================================================= */

function playCard(
  playerIndex,
  card
) {

  const player =
    game.players[playerIndex];


  const index =
    player.hand.findIndex(
      c => c.id === card.id
    );


  if (
    index === -1
  ) {

    return;

  }


  player.hand.splice(
    index,
    1
  );


  game.trickCards.push({

    playerIndex,

    card

  });


  /*
    First card establishes lead suit.
  */

  if (
    game.trickCards.length === 1
  ) {

    game.leadSuit =
      card.suit;

    game.leadPlayer =
      playerIndex;

  }


  /*
    Four cards complete trick.
  */

  if (
    game.trickCards.length === 4
  ) {

    game.phase =
      "trickComplete";


    updateUI();


    setTimeout(
      resolveTrick,
      1200
    );


    return;

  }


  /*
    Next clockwise player.
  */

  game.currentTurn =
    nextPlayer(playerIndex);


  updateUI();

}


/* =========================================================
   SHOW TRUMP
========================================================= */

function showTrump() {

  if (
    game.phase !== "playing"
  ) {

    return;

  }


  const playerIndex =
    game.currentTurn;


  /*
    Cannot show trump while holding
    lead suit.
  */

  if (
    game.leadSuit &&
    hasSuit(
      playerIndex,
      game.leadSuit
    )
  ) {

    showMessage(
      "You have the lead suit, so you cannot show trump."
    );

    return;

  }


  /*
    Already revealed.
  */

  if (
    game.trumpRevealed
  ) {

    showMessage(
      "Trump has already been revealed."
    );

    return;

  }


  /*
    Reveal trump.
  */

  game.trumpRevealed =
    true;


  /*
    Check marriage after reveal.
  */

  checkMarriage();


  const player =
    game.players[playerIndex];


  const trumpCards =
    player.hand.filter(
      card =>
        card.suit === game.trumpSuit
    );


  /*
    If player has trump,
    they MUST play trump.
  */

  if (
    trumpCards.length > 0
  ) {

    game.phase =
      "forcedTrump";


    showMessage(
      `Trump is ${SUIT_NAME[game.trumpSuit]}. You must play a trump card.`
    );


    updateUI();

    return;

  }


  /*
    No trump in hand.
    Any card can be played.
  */

  game.phase =
    "playing";


  showMessage(
    `Trump is ${SUIT_NAME[game.trumpSuit]}. You have no trump card.`
  );


  updateUI();

}


/* =========================================================
   MARRIAGE
========================================================= */

function checkMarriage() {

  if (
    !game.trumpRevealed ||
    !game.trumpSuit
  ) {

    return;

  }


  let marriagePlayer =
    null;


  /*
    Find player who has
    Trump King + Trump Queen.
  */

  for (
    const player of game.players
  ) {

    const hasKing =
      player.hand.some(
        card =>
          card.suit === game.trumpSuit &&
          card.rank === "K"
      );


    const hasQueen =
      player.hand.some(
        card =>
          card.suit === game.trumpSuit &&
          card.rank === "Q"
      );


    if (
      hasKing &&
      hasQueen
    ) {

      marriagePlayer =
        player;

      break;

    }

  }


  /*
    No marriage.
  */

  if (
    !marriagePlayer
  ) {

    game.marriage =
      null;


    game.effectiveBid =
      game.currentBid;


    return;

  }


  /*
    Bidder team.
  */

  const bidderTeam =
    game.players[
      game.highestBidder
    ].team;


  const marriageTeam =
    marriagePlayer.team;


  /*
    Bidder team has marriage.
  */

  if (
    marriageTeam === bidderTeam
  ) {

    game.effectiveBid =
      Math.max(
        MIN_BID,
        game.currentBid - 4
      );


    game.marriage = {

      team: marriageTeam,

      type: "bidder",

      amount: -4

    };


    showMarriageNotification();


    showMessage(
      `💍 MARRIAGE! Bid ${game.currentBid} → ${game.effectiveBid}`
    );


  }

  /*
    Opponent team has marriage.
  */

  else {

    game.effectiveBid =
      game.currentBid + 4;


    game.marriage = {

      team: marriageTeam,

      type: "opponent",

      amount: 4

    };


    showMarriageNotification();


    showMessage(
      `💍 MARRIAGE! Bid ${game.currentBid} → ${game.effectiveBid}`
    );

  }


  updateUI();

}


/* =========================================================
   FORCED TRUMP
========================================================= */

function attemptForcedTrump(
  cardId
) {

  if (
    game.phase !== "forcedTrump"
  ) {

    return;

  }


  const playerIndex =
    game.currentTurn;


  const player =
    game.players[playerIndex];


  const card =
    player.hand.find(
      c => c.id === cardId
    );


  if (!card) {

    return;

  }


  if (
    card.suit !== game.trumpSuit
  ) {

    showMessage(
      "You must play a trump card."
    );

    return;

  }


  playCard(
    playerIndex,
    card
  );

}


/* =========================================================
   DISCARD WITHOUT SHOWING TRUMP
========================================================= */

function enableDiscardMode() {

  if (
    game.phase !== "playing"
  ) {

    return;

  }


  const playerIndex =
    game.currentTurn;


  if (
    game.leadSuit &&
    hasSuit(
      playerIndex,
      game.leadSuit
    )
  ) {

    showMessage(
      "You must follow the lead suit."
    );

    return;

  }


  showMessage(
    "Choose any card to discard without showing trump."
  );

}


/* =========================================================
   DETERMINE TRICK WINNER
========================================================= */

function determineTrickWinner() {

  if (
    game.trickCards.length !== 4
  ) {

    return null;

  }


  let winner =
    game.trickCards[0];


  for (
    let i = 1;
    i < game.trickCards.length;
    i++
  ) {

    const challenger =
      game.trickCards[i];


    if (
      cardBeats(
        challenger.card,
        winner.card,
        game.leadSuit,
        game.trumpSuit
      )
    ) {

      winner =
        challenger;

    }

  }


  return winner.playerIndex;

}


/* =========================================================
   CARD COMPARISON
========================================================= */

function cardBeats(
  candidate,
  currentWinner,
  leadSuit,
  trumpSuit
) {

  /*
    Trump beats non-trump.
  */

  if (
    candidate.suit === trumpSuit &&
    currentWinner.suit !== trumpSuit
  ) {

    return true;

  }


  if (
    candidate.suit !== trumpSuit &&
    currentWinner.suit === trumpSuit
  ) {

    return false;

  }


  /*
    Candidate outside lead suit
    cannot beat lead suit.
  */

  if (
    candidate.suit !== leadSuit &&
    currentWinner.suit === leadSuit
  ) {

    return false;

  }


  if (
    candidate.suit === leadSuit &&
    currentWinner.suit !== leadSuit
  ) {

    return true;

  }


  /*
    Same effective suit.
  */

  return (
    RANK_VALUE[candidate.rank] >
    RANK_VALUE[currentWinner.rank]
  );

}


/* =========================================================
   RESOLVE TRICK
========================================================= */

async function resolveTrick() {

  const winner =
    determineTrickWinner();


  if (
    winner === null
  ) {

    return;

  }


  const winningCards =
    game.trickCards.map(
      entry => entry.card
    );


  /*
    Calculate trick points.
  */

  let trickPointTotal = 0;


  for (
    const card of winningCards
  ) {

    trickPointTotal +=
      CARD_POINTS[card.rank];

  }


  const winningTeam =
    getTeam(winner);


  game.trickPoints[winningTeam] +=
    trickPointTotal;


  /*
    Winner captures all four cards.
  */

  game.players[winner]
    .captured
    .push(
      ...winningCards
    );


  game.trickNumber++;


  const winnerName =
    getPlayerName(winner);


  showMessage(
    `${winnerName} won Trick ${game.trickNumber}.`
  );


  updateUI();


  await sleep(900);


  /*
    Clear trick.
  */

  game.trickCards = [];

  game.leadSuit = null;


  /*
    Winner leads next trick.
  */

  game.leadPlayer =
    winner;


  game.currentTurn =
    winner;


  /*
    Eight tricks complete.
  */

  if (
    game.trickNumber >= 8
  ) {

    finishHand();

    return;

  }


  game.phase =
    "playing";


  updateUI();

}


/* =========================================================
   CALCULATE TEAM POINTS
========================================================= */

function calculateTeamPoints(team) {

  let points = 0;


  for (
    const player of game.players
  ) {

    if (
      player.team !== team
    ) {

      continue;

    }


    for (
      const card of player.captured
    ) {

      points +=
        CARD_POINTS[card.rank];

    }

  }


  return points;

}


/* =========================================================
   FINISH HAND
========================================================= */

async function finishHand() {

  game.phase =
    "handComplete";


  updateUI();


  const teamAPoints =
    calculateTeamPoints("A");


  const teamBPoints =
    calculateTeamPoints("B");


  /*
    Total must be 28.
  */

  if (
    teamAPoints + teamBPoints !== 28
  ) {

    console.error(
      "Point calculation error:",
      teamAPoints,
      teamBPoints
    );


    showMessage(
      "Internal error: total points are not 28."
    );


    return;

  }


  const bidder =
    game.highestBidder;


  const bidderTeam =
    getTeam(bidder);


  const defenderTeam =
    bidderTeam === "A"
      ? "B"
      : "A";


  const bidderPoints =
    bidderTeam === "A"
      ? teamAPoints
      : teamBPoints;


  const targetBid =
    game.effectiveBid ??
    game.currentBid;


  const success =
    bidderPoints >= targetBid;


  /*
    Score.
  */

  if (success) {

    game.teamScore[bidderTeam] += 1;

    game.teamScore[defenderTeam] -= 1;

  }

  else {

    game.teamScore[bidderTeam] -= 1;

    game.teamScore[defenderTeam] += 1;

  }


  const resultText =
    success

      ? `${getPlayerName(bidder)}'s team made ${bidderPoints} points and succeeded.`

      : `${getPlayerName(bidder)}'s team made ${bidderPoints} points and failed.`;


  showMessage(
    `${resultText} Score: Team A ${game.teamScore.A}, Team B ${game.teamScore.B}`
  );


  /*
    Match winner?
  */

  const winner =
    getMatchWinner();


  if (
    winner !== null
  ) {

    game.matchOver =
      true;


    game.phase =
      "matchComplete";


    showMatchWinner(
      winner
    );


    return;

  }


  /*
    Next hand.
  */

  await sleep(1800);


  startNewHand();

}


/* =========================================================
   MATCH WINNER
========================================================= */

function getMatchWinner() {

  if (
    game.teamScore.A >= 6 ||
    game.teamScore.B <= -6
  ) {

    return "A";

  }


  if (
    game.teamScore.B >= 6 ||
    game.teamScore.A <= -6
  ) {

    return "B";

  }


  return null;

}


function showMatchWinner(team) {

  const teamName =
    team === "A"
      ? "Team A"
      : "Team B";


  gameStatus.textContent =
    `${teamName} Wins`;


  turnMessage.textContent =
    `${teamName} won the match!`;


  showMessage(
    `${teamName} reached the winning condition.`
  );

}


/* =========================================================
   UI UPDATE
========================================================= */

function updateUI() {

  /*
    Scores
  */

  $("teamAScore").textContent =
    game.teamScore.A;


  $("teamBScore").textContent =
    game.teamScore.B;


  /*
    Trick points
  */

  $("trickScoreA").textContent =
    game.trickPoints.A;


  $("trickScoreB").textContent =
    game.trickPoints.B;


  /*
    Dealer
  */

  $("dealerText").textContent =
    getPlayerName(game.dealer);


  /*
    Bidding starter
  */

  $("bidStarterText").textContent =
    getPlayerName(game.biddingStarter);


  /*
    Current bid
  */

  $("currentBidText").textContent =
    game.currentBid ?? "-";


  /*
    Bid winner
  */

  $("bidWinnerText").textContent =

    game.highestBidder !== null

      ? getPlayerName(
          game.highestBidder
        )

      : "-";


  /*
    Tricks
  */

  $("trickText").textContent =
    `${game.trickNumber} / 8`;


  /*
    Trump
  */

  if (
    game.trumpRevealed &&
    game.trumpSuit
  ) {

    $("trumpText").textContent =
      `${SUIT_SYMBOL[game.trumpSuit]} ${SUIT_NAME[game.trumpSuit]}`;

  }

  else {

    $("trumpText").textContent =
      "Hidden";

  }


  /*
    Render
  */

  renderCurrentTrick();

  renderActionPanels();

  renderCurrentHand();

  updatePlayerNames();


  /*
    Status
  */

  if (
    game.phase === "bidding"
  ) {

    gameStatus.textContent =
      `Bidding: ${getPlayerName(game.biddingTurn)}`;

  }


  else if (
    game.phase === "trump"
  ) {

    gameStatus.textContent =
      `Trump selection: ${getPlayerName(game.trumpSelectionPlayer)}`;

  }


  else if (
    game.phase === "playing" ||
    game.phase === "forcedTrump"
  ) {

    gameStatus.textContent =
      `Turn: ${getPlayerName(game.currentTurn)}`;

  }


  else if (
    game.phase === "handComplete"
  ) {

    gameStatus.textContent =
      "Hand Complete";

  }

}


/* =========================================================
   PLAYER NAMES
========================================================= */

function updatePlayerNames() {

  $("player1Name").textContent =
    game.players[0].name;


  $("player2Name").textContent =
    game.players[1].name;


  $("player3Name").textContent =
    game.players[2].name;


  $("player4Name").textContent =
    game.players[3].name;

}


/* =========================================================
   RENDER CURRENT TRICK
========================================================= */

function renderCurrentTrick() {

  const positions = {

    0: $("played1Side"),

    1: $("played2"),

    2: $("played3"),

    3: $("played4Side")

  };


  /*
    Clear slots.
  */

  Object.values(
    positions
  ).forEach(
    element => {

      if (element) {

        element.innerHTML = "";

      }

    }
  );


  /*
    Render played cards.
  */

  for (
    const entry of game.trickCards
  ) {

    const container =
      positions[entry.playerIndex];


    if (
      !container
    ) {

      continue;

    }


    container.appendChild(
      createCardElement(
        entry.card,
        false
      )
    );

  }

}


/* =========================================================
   RENDER CURRENT HAND
========================================================= */

function renderCurrentHand() {

  playerHand.innerHTML = "";


  if (
    !game.started
  ) {

    $("currentPlayerTitle").textContent =
      "Player 1";


    $("handInstruction").textContent =
      "Press Start Game";


    return;

  }


  /*
    Determine whose hand is displayed.
  */

  let playerIndex = 0;


  if (
    game.phase === "bidding" &&
    game.biddingTurn !== null
  ) {

    playerIndex =
      game.biddingTurn;

  }


  else if (
    game.phase === "trump" &&
    game.trumpSelectionPlayer !== null
  ) {

    playerIndex =
      game.trumpSelectionPlayer;

  }


  else if (
    (
      game.phase === "playing" ||
      game.phase === "forcedTrump"
    ) &&
    game.currentTurn !== null
  ) {

    playerIndex =
      game.currentTurn;

  }


  const player =
    game.players[playerIndex];


  $("currentPlayerTitle").textContent =
    player.name;


  $("handInstruction").textContent =
    getHandInstruction(
      playerIndex
    );


  const playableIds =
    getPlayableCards(
      playerIndex
    ).map(
      card => card.id
    );


  /*
    Sort cards.
  */

  const sortedHand =
    [...player.hand].sort(
      sortCards
    );


  for (
    const card of sortedHand
  ) {

    const isPlayable =
      playableIds.includes(
        card.id
      );


    const element =
      createCardElement(
        card,
        isPlayable
      );


    element.addEventListener(
      "click",
      () => handleCardClick(card)
    );


    playerHand.appendChild(
      element
    );

  }

}


/* =========================================================
   CARD SORT
========================================================= */

function sortCards(a, b) {

  const suitOrder = {

    hearts: 0,

    diamonds: 1,

    clubs: 2,

    spades: 3

  };


  if (
    suitOrder[a.suit] !==
    suitOrder[b.suit]
  ) {

    return (
      suitOrder[a.suit] -
      suitOrder[b.suit]
    );

  }


  return (
    RANK_VALUE[b.rank] -
    RANK_VALUE[a.rank]
  );

}


/* =========================================================
   CREATE CARD ELEMENT
========================================================= */

function createCardElement(
  card,
  playable
) {

  const element =
    document.createElement(
      "button"
    );


  element.className =
    "card";


  /*
    Red cards.
  */

  if (
    card.suit === "hearts" ||
    card.suit === "diamonds"
  ) {

    element.classList.add(
      "red"
    );

  }


  /*
    Playable state.
  */

  if (
    playable
  ) {

    element.classList.add(
      "playable"
    );

  }


  element.innerHTML = `

    <span class="card-rank">
      ${card.rank}
    </span>

    <span class="card-suit">
      ${SUIT_SYMBOL[card.suit]}
    </span>

  `;


  return element;

}


/* =========================================================
   HAND INSTRUCTION
========================================================= */

function getHandInstruction(
  playerIndex
) {

  /*
    Bidding
  */

  if (
    game.phase === "bidding"
  ) {

    if (
      playerIndex === game.biddingTurn
    ) {

      if (
        game.currentBid === null
      ) {

        return "Make the opening bid";

      }


      if (
        playerIndex === game.highestBidder
      ) {

        return "Your duel turn: bid higher or pass";

      }


      return "Challenge with a higher bid or pass";

    }


    return "Waiting for bidder";

  }


  /*
    Trump
  */

  if (
    game.phase === "trump"
  ) {

    return "Choose a hidden trump";

  }


  /*
    Forced trump
  */

  if (
    game.phase === "forcedTrump"
  ) {

    return "You showed trump. You must play trump.";

  }


  /*
    Playing
  */

  if (
    game.phase === "playing"
  ) {

    if (
      playerIndex !== game.currentTurn
    ) {

      return "Waiting for your turn";

    }


    if (
      !game.leadSuit
    ) {

      return "Lead any card";

    }


    if (
      hasSuit(
        playerIndex,
        game.leadSuit
      )
    ) {

      return `Follow ${SUIT_NAME[game.leadSuit]}`;

    }


    if (
      !game.trumpRevealed
    ) {

      return "No lead suit. Show trump or discard.";

    }


    return "No lead suit. Play any card.";

  }


  return "";

}


/* =========================================================
   CARD CLICK
========================================================= */

function handleCardClick(
  card
) {

  /*
    Forced trump.
  */

  if (
    game.phase === "forcedTrump"
  ) {

    attemptForcedTrump(
      card.id
    );

    return;

  }


  /*
    Normal playing.
  */

  if (
    game.phase !== "playing"
  ) {

    return;

  }


  attemptPlayCard(
    card.id
  );

}


/* =========================================================
   ACTION PANELS
========================================================= */

function renderActionPanels() {

  /*
    Bidding panel.
  */

  biddingPanel.classList.toggle(
    "hidden",
    game.phase !== "bidding"
  );


  /*
    Trump selection.
  */

  trumpPanel.classList.toggle(
    "hidden",
    game.phase !== "trump"
  );


  /*
    Show trump panel.
  */

  let canShowTrump =
    false;


  if (
    game.phase === "playing"
  ) {

    const playerIndex =
      game.currentTurn;


    if (
      game.leadSuit &&
      !hasSuit(
        playerIndex,
        game.leadSuit
      ) &&
      !game.trumpRevealed
    ) {

      canShowTrump =
        true;

    }

  }


  trumpShowPanel.classList.toggle(
    "hidden",
    !canShowTrump
  );


  /* =====================================================
     BIDDING UI
  ===================================================== */

  if (
    game.phase === "bidding"
  ) {

    $("biddingPlayerText").textContent =
      `${getPlayerName(game.biddingTurn)}'s turn to bid.`;


    const isOpeningBid =
      game.currentBid === null;


    /*
      First bidder cannot pass.
    */

    $("passButton").disabled =
      isOpeningBid;


    /*
      Minimum allowed bid.
    */

    $("bidInput").min =
      isOpeningBid

        ? MIN_BID

        : game.currentBid + 1;

  }


  /* =====================================================
     TRUMP UI
  ===================================================== */

  if (
    game.phase === "trump"
  ) {

    $("trumpPlayerText").textContent =
      `${getPlayerName(game.trumpSelectionPlayer)} must select a hidden trump.`;

  }


  /*
    Forced trump.
  */

  if (
    game.phase === "forcedTrump"
  ) {

    trumpShowPanel.classList.add(
      "hidden"
    );

  }

}


/* =========================================================
   MESSAGE
========================================================= */

function showMessage(
  message
) {

  if (
    globalMessage
  ) {

    globalMessage.textContent =
      message;

  }


  if (
    turnMessage
  ) {

    turnMessage.textContent =
      message;

  }

}


/* =========================================================
   MARRIAGE NOTIFICATION
========================================================= */

function showMarriageNotification() {

  const notification =
    $("marriageNotification");


  if (
    !notification
  ) {

    return;

  }


  notification.classList.remove(
    "hidden"
  );


  setTimeout(
    () => {

      notification.classList.add(
        "hidden"
      );

    },
    1000
  );

}


/* =========================================================
   EVENT LISTENERS
========================================================= */

if (
  startButton
) {

  startButton.addEventListener(
    "click",
    startGame
  );

}


if (
  $("bidButton")
) {

  $("bidButton").addEventListener(
    "click",
    submitBid
  );

}


if (
  $("passButton")
) {

  $("passButton").addEventListener(
    "click",
    submitPass
  );

}


if (
  $("showTrumpButton")
) {

  $("showTrumpButton").addEventListener(
    "click",
    showTrump
  );

}


if (
  $("discardButton")
) {

  $("discardButton").addEventListener(
    "click",
    enableDiscardMode
  );

}


/*
  Trump buttons.
*/

document
  .querySelectorAll(
    ".suit-buttons button"
  )
  .forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          const suit =
            button.dataset.suit;


          selectTrump(
            suit
          );

        }
      );

    }
  );


/* =========================================================
   INITIAL UI
========================================================= */

updateUI();

