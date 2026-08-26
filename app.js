"use strict";

/*
  =========================================================
  29 CARD GAME
  =========================================================

  Rules:
  - 32 cards
  - J > 9 > A > 10 > K > Q > 8 > 7
  - J = 3 points
  - 9 = 2 points
  - A = 1 point
  - 10 = 1 point
  - Total = 28 points
  - Dealer rotates
  - Bidding starts after dealer
  - First bidder must bid at least 16
  - Highest bidder chooses hidden trump
  - First trick starts from bidding starter
  - Follow suit is mandatory
  - If player has no lead suit:
      * may discard without showing trump
      * may show trump
      * if trump is shown and player has trump,
        they must play a trump
  - Marriage:
      * Trump K + Q in same player's hand
      * Bidder team Marriage: bid -4
      * Opponent team Marriage: bid +4
  - Contract success: bidder team >= effective bid
  - Contract failure: bidder team < effective bid
  - Successful contract: bidder team +1
  - Failed contract: bidder team -1
  - Match ends when a team reaches +6
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

  biddingStarter: 1,

  currentBid: null,

  highestBidder: null,

  biddingTurn: null,

  biddingOpponent: null,

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

  for (let i = arr.length - 1; i > 0; i--) {

    const j = Math.floor(
      Math.random() * (i + 1)
    );

    [arr[i], arr[j]] = [
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

  if (startPanel) {

    startPanel.classList.add("hidden");

  }

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


  /* -------------------------
     Reset bidding
  ------------------------- */

  game.currentBid = null;

  game.highestBidder = null;

  game.biddingTurn = null;

  game.biddingOpponent = null;

  game.passedPlayers = new Set();


  /* -------------------------
     Reset trump
  ------------------------- */

  game.trumpSuit = null;

  game.trumpRevealed = false;

  game.trumpSelectionPlayer = null;


  /* -------------------------
     Reset Marriage
  ------------------------- */

  game.marriage = null;

  game.effectiveBid = null;


  /* -------------------------
     Reset trick
  ------------------------- */

  game.leadPlayer = null;

  game.currentTurn = null;

  game.leadSuit = null;

  game.trickCards = [];

  game.trickNumber = 0;


  /* -------------------------
     Reset trick points
  ------------------------- */

  game.trickPoints.A = 0;

  game.trickPoints.B = 0;


  /* -------------------------
     Reset players
  ------------------------- */

  for (const player of game.players) {

    player.hand = [];

    player.captured = [];

  }


  /* -------------------------
     Rotate dealer
  ------------------------- */

  if (game.handNumber > 1) {

    game.dealer =
      nextPlayer(game.dealer);

  }


  /* -------------------------
     Bidding starter
  ------------------------- */

  game.biddingStarter =
    nextPlayer(game.dealer);


  /* -------------------------
     Deal first 4 cards
  ------------------------- */

  dealCards(4);


  /* -------------------------
     Start bidding
  ------------------------- */

  game.phase = "bidding";

  game.biddingTurn =
    game.biddingStarter;


  updateUI();

}


/* =========================================================
   DEAL CARDS
========================================================= */

function dealCards(numberEach) {

  for (let i = 0; i < numberEach; i++) {

    for (let p = 0; p < 4; p++) {

      const card = game.deck.pop();

      if (card) {

        game.players[p].hand.push(card);

      }

    }

  }

}


/* =========================================================
   BIDDING
========================================================= */
function submitBid() {

  if (game.phase !== "bidding") {
    return;
  }

  const player = game.biddingTurn;
  const input = $("bidInput");
  const value = Number(input.value);

  if (!Number.isInteger(value)) {
    showMessage("Enter a valid bid.");
    return;
  }

  /*
    ==========================================
    OPENING BID
    ==========================================
  */

  if (game.currentBid === null) {

    if (player !== game.biddingStarter) {
      showMessage("Invalid bidding state.");
      return;
    }

    if (value < MIN_BID || value > MAX_BID) {
      showMessage(
        `First bid must be between ${MIN_BID} and ${MAX_BID}.`
      );
      return;
    }

    /*
      First player opens the bidding.
    */

    game.currentBid = value;
    game.highestBidder = player;

    /*
      Next clockwise player challenges
      the opening bidder.
    */

    game.biddingOpponent = nextPlayer(player);
    game.biddingTurn = game.biddingOpponent;

    input.value = "";

    updateUI();

    return;
  }


  /*
    ==========================================
    DUEL BIDDING
    ==========================================
  */

  const winner = game.highestBidder;
  const challenger = game.biddingOpponent;


  /*
    Safety check
  */

  if (
    player !== winner &&
    player !== challenger
  ) {

    showMessage("Invalid bidding turn.");
    return;
  }


  /*
    ==========================================
    CHALLENGER BIDS
    ==========================================
  */

  if (player === challenger) {

    /*
      Challenger MUST bid higher than
      the current bid.
    */

    if (value <= game.currentBid) {

      showMessage(
        `Bid must be higher than ${game.currentBid}.`
      );

      return;
    }

    if (value > MAX_BID) {

      showMessage(
        `Maximum bid is ${MAX_BID}.`
      );

      return;
    }

    /*
      Challenger becomes the new
      temporary highest bidder.

      Previous winner gets another chance.
    */

    game.currentBid = value;

    game.highestBidder = challenger;

    game.biddingTurn = winner;

    input.value = "";

    updateUI();

    return;
  }


  /*
    ==========================================
    CURRENT WINNER BIDS
    ==========================================
  */

  if (player === winner) {

    /*
      Winner must also bid higher.
      Equal bids are NOT allowed.
    */

    if (value <= game.currentBid) {

      showMessage(
        `Bid must be higher than ${game.currentBid}.`
      );

      return;
    }

    if (value > MAX_BID) {

      showMessage(
        `Maximum bid is ${MAX_BID}.`
      );

      return;
    }

    /*
      Winner keeps the lead.

      Challenger gets the next chance.
    */

    game.currentBid = value;

    game.highestBidder = winner;

    game.biddingTurn = challenger;

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

  const player = game.biddingTurn;

  /*
    ==========================================
    OPENING BID
    ==========================================
  */

  if (game.currentBid === null) {

    showMessage(
      "The first bidder must make the opening bid."
    );

    return;
  }


  const winner = game.highestBidder;
  const challenger = game.biddingOpponent;


  /*
    ==========================================
    SAFETY CHECK
    ==========================================
  */

  if (
    player !== winner &&
    player !== challenger
  ) {

    showMessage("Invalid bidding turn.");

    return;
  }


  /*
    ==========================================
    CHALLENGER PASSES
    ==========================================
  */

  if (player === challenger) {

    /*
      Challenger gives up.

      Current winner wins this duel.
    */

    /*
      Check whether this was the final player.

      If the challenger is the last player
      in the clockwise sequence, bidding ends.
    */

    const nextPlayerAfterWinner =
      nextPlayer(winner);

    /*
      If next player is the bidding starter,
      all four players have now had their chance.
    */

    if (
      nextPlayerAfterWinner === game.biddingStarter
    ) {

      finishBidding();

      return;
    }


    /*
      Current winner now challenges
      the next clockwise player.
    */

    game.biddingOpponent =
      nextPlayerAfterWinner;

    game.biddingTurn =
      game.biddingOpponent;

    updateUI();

    return;
  }


  /*
    ==========================================
    CURRENT WINNER PASSES
    ==========================================
  */

  if (player === winner) {

    /*
      Winner gives up.

      Challenger becomes the new winner.
    */

    game.highestBidder = challenger;


    /*
      The player who just passed is now
      considered finished.
    */

    game.passedPlayers.add(winner);


    /*
      Next player after the new winner.
    */

    const nextOpponent =
      nextPlayer(challenger);


    /*
      If the next player is the original
      bidding starter, everyone has had
      their opportunity.
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


  game.phase = "trump";

  game.trumpSelectionPlayer =
    game.highestBidder;


  updateUI();

}


/* =========================================================
   SELECT TRUMP
========================================================= */

function selectTrump(suit) {

  if (game.phase !== "trump") {

    return;

  }

  if (
    game.trumpSelectionPlayer === null
  ) {

    return;

  }


  if (!SUITS.includes(suit)) {

    return;

  }


  game.trumpSuit = suit;

  /*
    Trump stays hidden.
  */

  game.trumpRevealed = false;


  /*
    Deal remaining 4 cards.
  */

  dealCards(4);


  /*
    First trick starts from bidding starter.
  */

  game.leadPlayer =
    game.biddingStarter;

  game.currentTurn =
    game.leadPlayer;

  game.phase = "playing";


  updateUI();

}


/* =========================================================
   CARD LEGALITY
========================================================= */

function hasSuit(playerIndex, suit) {

  return game.players[playerIndex]
    .hand
    .some(card => card.suit === suit);

}


function getPlayableCards(playerIndex) {

  const player =
    game.players[playerIndex];


  /*
    First card of trick.
  */

  if (!game.leadSuit) {

    return [
      ...player.hand
    ];

  }


  /*
    Find lead suit cards.
  */

  const matchingSuit =
    player.hand.filter(
      card =>
        card.suit === game.leadSuit
    );


  /*
    Follow suit is mandatory.
  */

  if (matchingSuit.length > 0) {

    return matchingSuit;

  }


  /*
    Player has no lead suit.

    They can discard any card
    without showing trump.
  */

  return [
    ...player.hand
  ];

}


/* =========================================================
   PLAY CARD
========================================================= */

function attemptPlayCard(cardId) {

  if (game.phase !== "playing") {

    return;

  }


  const playerIndex =
    game.currentTurn;

  const player =
    game.players[playerIndex];


  const cardIndex =
    player.hand.findIndex(
      card =>
        card.id === cardId
    );


  if (cardIndex === -1) {

    showMessage(
      "That card is not in this player's hand."
    );

    return;

  }


  const card =
    player.hand[cardIndex];


  /*
    Follow suit check.
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

function playCard(playerIndex, card) {

  const player =
    game.players[playerIndex];


  const index =
    player.hand.findIndex(
      c =>
        c.id === card.id
    );


  if (index === -1) {

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
    Next player.
  */

  game.currentTurn =
    nextPlayer(playerIndex);


  updateUI();

}


/* =========================================================
   SHOW TRUMP
========================================================= */

function showTrump() {

  if (game.phase !== "playing") {

    return;

  }


  const playerIndex =
    game.currentTurn;


  /*
    Player must not have lead suit.
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


  if (game.trumpRevealed) {

    showMessage(
      "Trump has already been revealed."
    );

    return;

  }


  /*
    Reveal trump.
  */

  game.trumpRevealed = true;


  /*
    Check Marriage immediately.
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
    Player has trump.
    Must play trump.
  */

  if (
    trumpCards.length > 0
  ) {

    game.phase =
      "forcedTrump";

    updateUI();

    showMessage(
      `Trump is ${SUIT_NAME[game.trumpSuit]}. You must play a trump card.`
    );

    return;

  }


  /*
    Player has no trump.
    Any card allowed.
  */

  game.phase =
    "playing";

  updateUI();

  showMessage(
    `Trump is ${SUIT_NAME[game.trumpSuit]}. You have no trump card.`
  );

}


/* =========================================================
   MARRIAGE
========================================================= */

function checkMarriage() {

  /*
    Trump must be revealed.
  */

  if (
    !game.trumpRevealed ||
    !game.trumpSuit
  ) {

    return;

  }


  /*
    Prevent Marriage from being
    recalculated again.
  */

  if (game.marriage !== null) {

    return;

  }


  let marriagePlayer = null;


  /*
    Search every player's hand.
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
    No Marriage.
  */

  if (!marriagePlayer) {

    game.marriage = null;

    game.effectiveBid =
      game.currentBid;

    updateUI();

    return;

  }


  const bidderTeam =
    game.players[
      game.highestBidder
    ].team;


  const marriageTeam =
    marriagePlayer.team;


  /*
    Bidder team Marriage.
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
    Opponent team Marriage.
  */

  else {

    game.effectiveBid =
      Math.min(
        MAX_BID,
        game.currentBid + 4
      );


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

function attemptForcedTrump(cardId) {

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
      c =>
        c.id === cardId
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
   DISCARD MODE
========================================================= */

function enableDiscardMode() {

  if (game.phase !== "playing") {

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
    "Choose any card to discard."
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
    Candidate is outside lead suit
    while winner follows lead suit.
  */

  if (
    candidate.suit !== leadSuit &&
    currentWinner.suit === leadSuit
  ) {

    return false;

  }


  /*
    Candidate follows lead suit
    while winner does not.
  */

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


  if (winner === null) {

    return;

  }


  const winningCards =
    game.trickCards.map(
      entry =>
        entry.card
    );


  /*
    Calculate points from this trick.
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


  game.trickPoints[
    winningTeam
  ] += trickPointTotal;


  /*
    Capture all four cards.
  */

  game.players[
    winner
  ].captured.push(
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
    Eight tricks completed.
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
    Total card points must be 28.
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


  if (bidder === null) {

    showMessage(
      "No bidder found."
    );

    return;

  }


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


  /*
    Use Marriage-adjusted bid.
  */

  const targetBid =
    game.effectiveBid ??
    game.currentBid;


  const success =
    bidderPoints >= targetBid;


  /*
    Zero-sum scoring.
  */

  if (success) {

    game.teamScore[
      bidderTeam
    ] += 1;

    game.teamScore[
      defenderTeam
    ] -= 1;

  }

  else {

    game.teamScore[
      bidderTeam
    ] -= 1;

    game.teamScore[
      defenderTeam
    ] += 1;

  }


  const resultText =
    success

      ? `${getPlayerName(bidder)}'s team made ${bidderPoints} points and succeeded.`

      : `${getPlayerName(bidder)}'s team made ${bidderPoints} points and failed.`;


  showMessage(
    `${resultText} Score: Team A ${game.teamScore.A}, Team B ${game.teamScore.B}`
  );


  updateUI();


  /*
    Check match winner.
  */

  const winner =
    getMatchWinner();


  if (winner !== null) {

    game.matchOver = true;

    game.phase =
      "matchComplete";


    showMatchWinner(winner);

    return;

  }


  /*
    Start next hand.
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


  if (gameStatus) {

    gameStatus.textContent =
      `${teamName} Wins`;

  }


  if (turnMessage) {

    turnMessage.textContent =
      `${teamName} won the match!`;

  }


  showMessage(
    `${teamName} reached the winning condition.`
  );

}


/* =========================================================
   UPDATE UI
========================================================= */

function updateUI() {

  /*
    Scores
  */

  const teamAScore =
    $("teamAScore");

  const teamBScore =
    $("teamBScore");

  const trickScoreA =
    $("trickScoreA");

  const trickScoreB =
    $("trickScoreB");


  if (teamAScore) {

    teamAScore.textContent =
      game.teamScore.A;

  }


  if (teamBScore) {

    teamBScore.textContent =
      game.teamScore.B;

  }


  if (trickScoreA) {

    trickScoreA.textContent =
      game.trickPoints.A;

  }


  if (trickScoreB) {

    trickScoreB.textContent =
      game.trickPoints.B;

  }


  /*
    Dealer
  */

  const dealerText =
    $("dealerText");

  if (dealerText) {

    dealerText.textContent =
      getPlayerName(game.dealer);

  }


  /*
    Bidding starter
  */

  const bidStarterText =
    $("bidStarterText");

  if (bidStarterText) {

    bidStarterText.textContent =
      getPlayerName(
        game.biddingStarter
      );

  }


  /*
    Current bid
  */

  const currentBidText =
    $("currentBidText");

  if (currentBidText) {

    currentBidText.textContent =
      game.effectiveBid ??
      game.currentBid ??
      "-";

  }


  /*
    Bid winner
  */

  const bidWinnerText =
    $("bidWinnerText");

  if (bidWinnerText) {

    bidWinnerText.textContent =
      game.highestBidder !== null
        ? getPlayerName(
            game.highestBidder
          )
        : "-";

  }


  /*
    Trick number
  */

  const trickText =
    $("trickText");

  if (trickText) {

    trickText.textContent =
      `${game.trickNumber} / 8`;

  }


  /*
    Trump
  */

  const trumpText =
    $("trumpText");


  if (trumpText) {

    if (
      game.trumpRevealed &&
      game.trumpSuit
    ) {

      trumpText.textContent =
        `${SUIT_SYMBOL[game.trumpSuit]} ${SUIT_NAME[game.trumpSuit]}`;

    }

    else {

      trumpText.textContent =
        "Hidden";

    }

  }


  /*
    Render everything.
  */

  renderCurrentTrick();

  renderActionPanels();

  renderCurrentHand();

  updatePlayerNames();


  /*
    Game status.
  */

  if (
    game.phase === "bidding"
  ) {

    if (gameStatus) {

      gameStatus.textContent =
        `Bidding: ${getPlayerName(game.biddingTurn)}`;

    }

  }

  else if (
    game.phase === "trump"
  ) {

    if (gameStatus) {

      gameStatus.textContent =
        `Trump selection: ${getPlayerName(game.trumpSelectionPlayer)}`;

    }

  }

  else if (
    game.phase === "playing" ||
    game.phase === "forcedTrump"
  ) {

    if (gameStatus) {

      gameStatus.textContent =
        `Turn: ${getPlayerName(game.currentTurn)}`;

    }

  }

  else if (
    game.phase === "handComplete"
  ) {

    if (gameStatus) {

      gameStatus.textContent =
        "Hand Complete";

    }

  }

}


/* =========================================================
   PLAYER NAMES
========================================================= */

function updatePlayerNames() {

  const player1Name =
    $("player1Name");

  const player2Name =
    $("player2Name");

  const player3Name =
    $("player3Name");

  const player4Name =
    $("player4Name");


  if (player1Name) {

    player1Name.textContent =
      game.players[0].name;

  }


  if (player2Name) {

    player2Name.textContent =
      game.players[1].name;

  }


  if (player3Name) {

    player3Name.textContent =
      game.players[2].name;

  }


  if (player4Name) {

    player4Name.textContent =
      game.players[3].name;

  }

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
    Clear all positions.
  */

  Object.values(positions)
    .forEach(element => {

      if (element) {

        element.innerHTML = "";

      }

    });


  /*
    Render played cards.
  */

  for (
    const entry of game.trickCards
  ) {

    const container =
      positions[entry.playerIndex];


    if (!container) {

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
   RENDER HAND
========================================================= */

function renderCurrentHand() {

  if (!playerHand) {

    return;

  }


  playerHand.innerHTML = "";


  if (!game.started) {

    const currentPlayerTitle =
      $("currentPlayerTitle");

    const handInstruction =
      $("handInstruction");


    if (currentPlayerTitle) {

      currentPlayerTitle.textContent =
        "Player 1";

    }


    if (handInstruction) {

      handInstruction.textContent =
        "Press Start Game";

    }


    return;

  }


  /*
    Determine whose hand is currently shown.
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


  const currentPlayerTitle =
    $("currentPlayerTitle");

  const handInstruction =
    $("handInstruction");


  if (currentPlayerTitle) {

    currentPlayerTitle.textContent =
      player.name;

  }


  if (handInstruction) {

    handInstruction.textContent =
      getHandInstruction(
        playerIndex
      );

  }


  /*
    Playable cards.
  */

  const playableIds =
    getPlayableCards(
      playerIndex
    ).map(
      card => card.id
    );


  /*
    Sort hand.
  */

  const sortedHand =
    [...player.hand].sort(
      sortCards
    );


  /*
    Render cards.
  */

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
      () => {

        handleCardClick(card);

      }
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
    Red suits.
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

  if (playable) {

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

  if (
    game.phase === "bidding"
  ) {

    return (
      playerIndex ===
      game.biddingTurn
    )

      ? "Make your bid"

      : "Waiting for bidder";

  }


  if (
    game.phase === "trump"
  ) {

    return "Choose a hidden trump";

  }


  if (
    game.phase === "forcedTrump"
  ) {

    return (
      "You showed trump. You must play trump."
    );

  }


  if (
    game.phase === "playing"
  ) {

    if (
      playerIndex !==
      game.currentTurn
    ) {

      return "Waiting for your turn";

    }


    if (!game.leadSuit) {

      return "Lead any card";

    }


    if (
      hasSuit(
        playerIndex,
        game.leadSuit
      )
    ) {

      return (
        `Follow ${SUIT_NAME[game.leadSuit]}`
      );

    }


    if (!game.trumpRevealed) {

      return (
        "No lead suit. Show trump or discard."
      );

    }


    return (
      "No lead suit. Play any card."
    );

  }


  return "";

}


/* =========================================================
   CARD CLICK
========================================================= */

function handleCardClick(card) {

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
    Normal play.
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

  if (biddingPanel) {

    biddingPanel.classList.toggle(
      "hidden",
      game.phase !== "bidding"
    );

  }


  if (trumpPanel) {

    trumpPanel.classList.toggle(
      "hidden",
      game.phase !== "trump"
    );

  }


  /*
    Show trump panel.
  */

  let canShowTrump = false;


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

      canShowTrump = true;

    }

  }


  if (trumpShowPanel) {

    trumpShowPanel.classList.toggle(
      "hidden",
      !canShowTrump
    );

  }


  /*
    Bidding UI.
  */

  if (
    game.phase === "bidding"
  ) {

    const biddingPlayerText =
      $("biddingPlayerText");


    if (biddingPlayerText) {

      biddingPlayerText.textContent =
        `${getPlayerName(game.biddingTurn)}'s turn to bid.`;

    }


    const passButton =
      $("passButton");


    const bidInput =
      $("bidInput");


    const isOpeningBid =
      game.currentBid === null &&
      game.biddingTurn ===
        game.biddingStarter;


    if (passButton) {

      passButton.disabled =
        isOpeningBid;

    }


    if (bidInput) {

      bidInput.min =
        game.currentBid === null
          ? MIN_BID
          : game.currentBid + 1;

    }

  }


  /*
    Trump selection UI.
  */

  if (
    game.phase === "trump"
  ) {

    const trumpPlayerText =
      $("trumpPlayerText");


    if (trumpPlayerText) {

      trumpPlayerText.textContent =
        `${getPlayerName(game.trumpSelectionPlayer)} must select a hidden trump.`;

    }

  }


  /*
    Forced trump.
  */

  if (
    game.phase === "forcedTrump"
  ) {

    if (trumpShowPanel) {

      trumpShowPanel.classList.add(
        "hidden"
      );

    }

  }

}


/* =========================================================
   MESSAGES
========================================================= */

function showMessage(message) {

  if (globalMessage) {

    globalMessage.textContent =
      message;

  }

}


/* =========================================================
   MARRIAGE NOTIFICATION
========================================================= */

function showMarriageNotification() {

  const notification =
    $("marriageNotification");


  if (!notification) {

    return;

  }


  notification.classList.remove(
    "hidden"
  );


  setTimeout(() => {

    notification.classList.add(
      "hidden"
    );

  }, 1000);

}


/* =========================================================
   EVENT LISTENERS
========================================================= */

if (startButton) {

  startButton.addEventListener(
    "click",
    startGame
  );

}


const bidButton =
  $("bidButton");


if (bidButton) {

  bidButton.addEventListener(
    "click",
    submitBid
  );

}


const passButton =
  $("passButton");


if (passButton) {

  passButton.addEventListener(
    "click",
    submitPass
  );

}


const showTrumpButton =
  $("showTrumpButton");


if (showTrumpButton) {

  showTrumpButton.addEventListener(
    "click",
    showTrump
  );

}


const discardButton =
  $("discardButton");


if (discardButton) {

  discardButton.addEventListener(
    "click",
    enableDiscardMode
  );

}


/*
  Trump suit buttons.
*/

document
  .querySelectorAll(
    ".suit-buttons button"
  )
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        const suit =
          button.dataset.suit;


        selectTrump(suit);

      }
    );

  });


/* =========================================================
   INITIAL UI
========================================================= */

updateUI();

