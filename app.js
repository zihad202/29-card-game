"use strict";

/*
  29 CARD GAME
  -------------------------------
  Four-player local prototype.

  Rules implemented:
  - 32 cards
  - J > 9 > A > 10 > K > Q > 8 > 7
  - J = 3, 9 = 2, A = 1, 10 = 1
  - Total = 28 points
  - No extra last-trick point
  - Dealer rotates
  - Bidding starts from player after dealer
  - First bidder must bid at least 16
  - Highest bidder chooses hidden trump
  - First trick starts from bidding starter
  - Winner of each trick leads next trick
  - Follow suit is mandatory
  - If player has no lead suit:
      * may SHOW TRUMP
      * if they show and possess trump, they MUST play a trump
      * if they do not show, they may discard another card
  - Contract success = bidder team >= bid
  - Contract failure = bidder team < bid
  - Score is zero-sum: winner team +1, loser team -1
  - Match ends when a team reaches +6 OR opponent reaches -6
*/


/* =========================================================
   CONSTANTS
========================================================= */

const SUITS = ["hearts", "diamonds", "clubs", "spades"];

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

const RANKS = ["7", "8", "Q", "K", "10", "A", "9", "J"];

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

    const j = Math.floor(Math.random() * (i + 1));

    [arr[i], arr[j]] = [arr[j], arr[i]];

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

  game.dealer = Math.floor(Math.random() * 4);

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

  game.deck = shuffle(createDeck());

  game.currentBid = null;
  game.highestBidder = null;
  game.biddingTurn = null;
  game.biddingOpponent = null;
  game.passedPlayers = new Set();

  game.trumpSuit = null;
  game.trumpRevealed = false;
  game.trumpSelectionPlayer = null;
  game.marriage = null;
  game.effectiveBid = null;
  game.leadPlayer = null;
  game.currentTurn = null;
  game.leadSuit = null;

  game.trickCards = [];
  game.trickNumber = 0;
  game.trickPoints.A = 0;
  game.trickPoints.B = 0;
  for (const player of game.players) {
    player.hand = [];
    player.captured = [];
  }

  /*
    Dealer rotates every hand.

    First hand uses the selected dealer.
    Following hands move clockwise.
  */

  if (game.handNumber > 1) {
    game.dealer = nextPlayer(game.dealer);
  }

  game.biddingStarter = nextPlayer(game.dealer);

  /*
    Deal exactly 4 cards to each player.
  */

  dealCards(4);

  /*
    Bidding begins with player after dealer.
  */

  game.phase = "bidding";

  game.biddingTurn = game.biddingStarter;

  /*
    The first bidder must establish the contract.
    Therefore they cannot pass before a bid exists.
  */

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
    First bidder must start with at least 16.
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

  } else {

    /*
      Challenger must bid higher than current bid.
      Highest bidder may match or raise.
    */

    if (player !== game.highestBidder) {

      if (value <= game.currentBid) {
        showMessage(
          `Bid must be higher than ${game.currentBid}.`
        );
        return;
      }

    } else {

      if (value < game.currentBid) {
        showMessage(
          `Bid must be at least ${game.currentBid}.`
        );
        return;
      }

    }

    if (value > MAX_BID) {
      showMessage(
        `Maximum bid is ${MAX_BID}.`
      );
      return;
    }
  }

  game.currentBid = value;
  game.highestBidder = player;

  game.passedPlayers.delete(player);

  input.value = "";

  moveBiddingTurn();
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
    First bidder cannot pass before making
    the opening bid.
  */

  if (
    game.currentBid === null &&
    player === game.biddingStarter
  ) {

    showMessage(
      "The first bidder must make the opening bid."
    );

    return;
  }

  /*
    Current player passes.
  */

  game.passedPlayers.add(player);

  /*
    If the current highest bidder passes,
    the opponent wins this bidding duel.
  */

  if (player === game.highestBidder) {

    /*
      The opponent becomes the new highest bidder.
    */

    game.highestBidder = game.biddingOpponent;

  }

  /*
    The duel is finished.
    Move to the next player.
  */

  const winner = game.highestBidder;

  const nextOpponent = nextPlayer(winner);

  /*
    If the next opponent is already the winner
    or has already passed, bidding is finished.
  */

  if (
    nextOpponent === winner ||
    game.passedPlayers.has(nextOpponent)
  ) {

    finishBidding();

    return;
  }

  /*
    Start a new bidding duel:
    winner ↔ next player
  */

  game.biddingOpponent = nextOpponent;

  game.biddingTurn = nextOpponent;

  updateUI();
}



/* =========================================================
   MOVE BIDDING TURN
========================================================= */
function moveBiddingTurn() {

  /*
    Bidding happens between only TWO players at a time.

    Example:
    P1 ↔ P2
    Winner ↔ P3
    Winner ↔ P4
  */

  if (game.highestBidder === null) {
    return;
  }

  /*
    If there is no current opponent yet,
    start with the player immediately after
    the bidding starter.
  */

  if (game.biddingOpponent === null) {

    game.biddingOpponent =
      nextPlayer(game.biddingStarter);

  }

  /*
    The current highest bidder and the opponent
    are the two players currently bidding against
    each other.
  */

  if (game.biddingTurn === game.highestBidder) {

    game.biddingTurn = game.biddingOpponent;

  } else {

    game.biddingTurn = game.highestBidder;

  }

  updateUI();
}


/* =========================================================
   FINISH BIDDING
========================================================= */

function finishBidding() {

  if (game.highestBidder === null) {

    showMessage("No valid bid was made.");

    return;
  }

  game.phase = "trump";

  game.trumpSelectionPlayer = game.highestBidder;

  updateUI();

}


/* =========================================================
   SELECT TRUMP
========================================================= */

function selectTrump(suit) {

  if (game.phase !== "trump") {
    return;
  }

  if (game.trumpSelectionPlayer === null) {
    return;
  }

  game.trumpSuit = suit;

  /*
    Trump remains hidden.
    Only the bidder knows it in this prototype.

    On the real multiplayer version this value will be
    stored privately on the bidder's device/server state.
  */

  game.trumpRevealed = false;

  /*
    Deal remaining 4 cards.
  */

  dealCards(4);

  /*
    IMPORTANT:
    First trick starts from bidding starter,
    NOT highest bidder.
  */

  game.leadPlayer = game.biddingStarter;

  game.currentTurn = game.leadPlayer;

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

  const player = game.players[playerIndex];

  /*
    No lead suit yet.
    Any card is playable.
  */

  if (!game.leadSuit) {

    return [...player.hand];

  }

  const matchingSuit = player.hand.filter(
    card => card.suit === game.leadSuit
  );

  /*
    Follow suit is mandatory.
  */

  if (matchingSuit.length > 0) {

    return matchingSuit;

  }

  /*
    Player has no lead suit.

    Trump is optional to reveal.

    Until they choose SHOW TRUMP,
    they can technically discard any card.

    UI will handle the decision.
  */

  return [...player.hand];

}


/* =========================================================
   PLAY CARD REQUEST
========================================================= */

function attemptPlayCard(cardId) {

  if (game.phase !== "playing") {
    return;
  }

  const playerIndex = game.currentTurn;

  const player = game.players[playerIndex];

  const cardIndex = player.hand.findIndex(
    card => card.id === cardId
  );

  if (cardIndex === -1) {

    showMessage("That card is not in this player's hand.");

    return;
  }

  const card = player.hand[cardIndex];

  /*
    FOLLOW SUIT CHECK
  */

  if (
    game.leadSuit &&
    card.suit !== game.leadSuit &&
    hasSuit(playerIndex, game.leadSuit)
  ) {

    showMessage(
      `You must follow ${SUIT_NAME[game.leadSuit]}.`
    );

    return;
  }

  /*
    If player has no lead suit, playing any card
    without showing trump is legal.

    However, if they choose SHOW TRUMP,
    a separate forced-trump path is used.
  */

  playCard(playerIndex, card);

}


/* =========================================================
   PLAY CARD
========================================================= */

function playCard(playerIndex, card) {

  const player = game.players[playerIndex];

  const index = player.hand.findIndex(
    c => c.id === card.id
  );

  if (index === -1) {
    return;
  }

  player.hand.splice(index, 1);

  game.trickCards.push({
    playerIndex,
    card
  });

  /*
    First card establishes lead suit.
  */

  if (game.trickCards.length === 1) {

    game.leadSuit = card.suit;

    game.leadPlayer = playerIndex;

  }

  /*
    Four cards complete the trick.
  */

  if (game.trickCards.length === 4) {

    game.phase = "trickComplete";

    updateUI();

    setTimeout(resolveTrick, 1200);

    return;
  }

  /*
    Move to next player.
  */

  game.currentTurn = nextPlayer(playerIndex);

  updateUI();

}


/* =========================================================
   SHOW TRUMP
========================================================= */

function showTrump() {

  if (game.phase !== "playing") {
    return;
  }

  const playerIndex = game.currentTurn;

  /*
    Trump can only be shown when player does NOT
    have the lead suit.
  */

  if (
    game.leadSuit &&
    hasSuit(playerIndex, game.leadSuit)
  ) {

    showMessage(
      "You have the lead suit, so you cannot show trump."
    );

    return;
  }

  if (game.trumpRevealed) {

    showMessage("Trump has already been revealed.");

    return;
  }

  /*
    Reveal trump.
  */

  game.trumpRevealed = true;
  checkMarriage();
  const player = game.players[playerIndex];

  const trumpCards = player.hand.filter(
    card => card.suit === game.trumpSuit
  );

  /*
    If player has trump, they MUST play a trump.
  */

  if (trumpCards.length > 0) {

    game.phase = "forcedTrump";

    updateUI();

    showMessage(
      `Trump is ${SUIT_NAME[game.trumpSuit]}. You must play a trump card.`
    );

    return;

  }

  /*
    Player showed trump but has no trump.
    Therefore any card can be played.
  */

  game.phase = "playing";

  updateUI();

  showMessage(
    `Trump is ${SUIT_NAME[game.trumpSuit]}. You have no trump card.`
  );

}
function checkMarriage() {

  // Trump reveal না হলে Marriage check করার দরকার নেই
  if (!game.trumpRevealed || !game.trumpSuit) {
    return;
  }

  // প্রথমে কোনো Marriage আছে কিনা খুঁজবো
  let marriagePlayer = null;

  for (const player of game.players) {

    const hasKing = player.hand.some(card =>
      card.suit === game.trumpSuit &&
      card.rank === "K"
    );

    const hasQueen = player.hand.some(card =>
      card.suit === game.trumpSuit &&
      card.rank === "Q"
    );

    // একই player's হাতে Trump King + Queen
    if (hasKing && hasQueen) {
      marriagePlayer = player;
      break;
    }
  }

  // Marriage নেই
  if (!marriagePlayer) {

    game.marriage = null;

    game.effectiveBid = game.currentBid;

    return;
  }

  // Bid Winner কোন team-এর
  const bidderTeam =
    game.players[game.highestBidder].team;

  // Marriage কোন team-এর
  const marriageTeam =
    marriagePlayer.team;

  // Bid Winner-এর team-এ Marriage
  if (marriageTeam === bidderTeam) {

    game.effectiveBid = Math.max(
      16,
      game.currentBid - 4
    );
   updateUI();
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

  // Opponent team-এ Marriage
  else {

    game.effectiveBid =
      game.currentBid + 4;
   updateUI();
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
      }

/* =========================================================
   PLAY TRUMP AFTER SHOW
========================================================= */

function attemptForcedTrump(cardId) {

  if (game.phase !== "forcedTrump") {
    return;
  }

  const playerIndex = game.currentTurn;

  const player = game.players[playerIndex];

  const card = player.hand.find(
    c => c.id === cardId
  );

  if (!card) {
    return;
  }

  if (card.suit !== game.trumpSuit) {

    showMessage("You must play a trump card.");

    return;
  }

  playCard(playerIndex, card);

}


/* =========================================================
   DISCARD WITHOUT SHOWING TRUMP
========================================================= */

function enableDiscardMode() {

  if (game.phase !== "playing") {
    return;
  }

  const playerIndex = game.currentTurn;

  if (
    game.leadSuit &&
    hasSuit(playerIndex, game.leadSuit)
  ) {

    showMessage("You must follow the lead suit.");

    return;
  }

  /*
    Normal playing mode already permits any card when
    the player has no lead suit.

    No trump reveal occurs.
  */

  showMessage("Choose any card to discard.");

}


/* =========================================================
   TRICK WINNER
========================================================= */

function determineTrickWinner() {

  if (game.trickCards.length !== 4) {
    return null;
  }

  let winner = game.trickCards[0];

  for (let i = 1; i < game.trickCards.length; i++) {

    const challenger = game.trickCards[i];

    if (
      cardBeats(
        challenger.card,
        winner.card,
        game.leadSuit,
        game.trumpSuit
      )
    ) {

      winner = challenger;

    }

  }

  return winner.playerIndex;

}


/* =========================================================
   CARD COMPARISON
========================================================= */

function cardBeats(candidate, currentWinner, leadSuit, trumpSuit) {

  /*
    Trump beats non-trump.
  */

  if (candidate.suit === trumpSuit &&
      currentWinner.suit !== trumpSuit) {

    return true;
  }

  if (candidate.suit !== trumpSuit &&
      currentWinner.suit === trumpSuit) {

    return false;
  }

  /*
    Neither/both are trump.

    A card outside lead suit cannot beat a lead-suit card
    unless it is trump.
  */

  if (candidate.suit !== leadSuit &&
      currentWinner.suit === leadSuit) {

    return false;
  }

  if (candidate.suit === leadSuit &&
      currentWinner.suit !== leadSuit) {

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

  const winner = determineTrickWinner();

  if (winner === null) {
    return;
  }

  const winningCards = game.trickCards.map(
    entry => entry.card
  );
let trickPointTotal = 0;

for (const card of winningCards) {
  trickPointTotal += CARD_POINTS[card.rank];
}

const winningTeam = getTeam(winner);

game.trickPoints[winningTeam] += trickPointTotal;
  updateUI();
  /*
    Add all four cards to winner's team's capture pile.

    For scoring purposes it is enough to store them
    on the winner's player.
  */

  game.players[winner].captured.push(...winningCards);

  game.trickNumber++;

  const winnerName = getPlayerName(winner);

  showMessage(
    `${winnerName} won Trick ${game.trickNumber}.`
  );

  await sleep(900);

  /*
    Clear current trick.
  */

  game.trickCards = [];

  game.leadSuit = null;

  /*
    Winner leads next trick.
  */

  game.leadPlayer = winner;

  game.currentTurn = winner;

  /*
    Eight tricks completed.
  */

  if (game.trickNumber >= 8) {

    finishHand();

    return;
  }

  game.phase = "playing";

  updateUI();

}


/* =========================================================
   CALCULATE POINTS
========================================================= */

function calculateTeamPoints(team) {

  let points = 0;

  for (const player of game.players) {

    if (player.team !== team) {
      continue;
    }

    for (const card of player.captured) {

      points += CARD_POINTS[card.rank];

    }

  }

  return points;

}


/* =========================================================
   FINISH HAND
========================================================= */

async function finishHand() {

  game.phase = "handComplete";

  updateUI();

  const teamAPoints = calculateTeamPoints("A");
  const teamBPoints = calculateTeamPoints("B");

  /*
    There are exactly 28 card points.
  */

  if (teamAPoints + teamBPoints !== 28) {

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

  const bidder = game.highestBidder;

  const bidderTeam = getTeam(bidder);

  const defenderTeam =
    bidderTeam === "A" ? "B" : "A";

  const bidderPoints =
    bidderTeam === "A"
      ? teamAPoints
      : teamBPoints;

 const targetBid =
  game.effectiveBid ?? game.currentBid;

 const success =
  bidderPoints >= targetBid;

  /*
    Zero-sum scoring:
    Successful contract:
      bidder team +1
      opponent -1

    Failed contract:
      bidder team -1
      opponent +1
  */

  if (success) {

    game.teamScore[bidderTeam] += 1;
    game.teamScore[defenderTeam] -= 1;

  } else {

    game.teamScore[bidderTeam] -= 1;
    game.teamScore[defenderTeam] += 1;

  }

  const resultText = success
    ? `${getPlayerName(bidder)}'s team made ${bidderPoints} points and succeeded.`
    : `${getPlayerName(bidder)}'s team made ${bidderPoints} points and failed.`;

  showMessage(
    `${resultText} Score: Team A ${game.teamScore.A}, Team B ${game.teamScore.B}`
  );

  /*
    Check match result.
  */

  const winner = getMatchWinner();

  if (winner !== null) {

    game.matchOver = true;
    game.phase = "matchComplete";

    showMatchWinner(winner);

    return;
  }

  /*
    Continue with next hand after short delay.
  */

  await sleep(1800);

  startNewHand();

}


/* =========================================================
   MATCH WINNER
========================================================= */

function getMatchWinner() {

  /*
    Team A wins if:
      A >= +6
      OR B <= -6

    Team B wins if:
      B >= +6
      OR A <= -6
  */

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

  const teamName = team === "A"
    ? "Team A"
    : "Team B";

  gameStatus.textContent = `${teamName} Wins`;

  turnMessage.textContent =
    `${teamName} won the match!`;

  showMessage(
    `${teamName} reached the winning condition.`
  );

}


/* =========================================================
   UI
========================================================= */

function updateUI() {

  $("teamAScore").textContent = game.teamScore.A;
  $("teamBScore").textContent = game.teamScore.B;
$("trickScoreA").textContent = game.trickPoints.A;
$("trickScoreB").textContent = game.trickPoints.B;
  $("dealerText").textContent =
    getPlayerName(game.dealer);

  $("bidStarterText").textContent =
    getPlayerName(game.biddingStarter);

  $("currentBidText").textContent =
  game.effectiveBid ?? game.currentBid ?? "-";

  $("bidWinnerText").textContent =
    game.highestBidder !== null
      ? getPlayerName(game.highestBidder)
      : "-";

  $("trickText").textContent =
    `${game.trickNumber} / 8`;

  /*
    Trump display
  */

  if (game.trumpRevealed && game.trumpSuit) {

    $("trumpText").textContent =
      `${SUIT_SYMBOL[game.trumpSuit]} ${SUIT_NAME[game.trumpSuit]}`;

  } else {

    $("trumpText").textContent = "Hidden";

  }

  renderCurrentTrick();

  renderActionPanels();

  renderCurrentHand();

  updatePlayerNames();

  /*
    Status
  */

  if (game.phase === "bidding") {

    gameStatus.textContent =
      `Bidding: ${getPlayerName(game.biddingTurn)}`;

  } else if (game.phase === "trump") {

    gameStatus.textContent =
      `Trump selection: ${getPlayerName(game.trumpSelectionPlayer)}`;

  } else if (
    game.phase === "playing" ||
    game.phase === "forcedTrump"
  ) {

    gameStatus.textContent =
      `Turn: ${getPlayerName(game.currentTurn)}`;

  } else if (game.phase === "handComplete") {

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
   RENDER TRICK
========================================================= */

function renderCurrentTrick() {

  const positions = {
    0: $("played1Side"),
    1: $("played2"),
    2: $("played3"),
    3: $("played4Side")
  };

  /*
    Clear all trick slots.
  */

  Object.values(positions).forEach(
    element => element.innerHTML = ""
  );

  for (const entry of game.trickCards) {

    const container = positions[entry.playerIndex];

    if (!container) {
      continue;
    }

    container.appendChild(
      createCardElement(entry.card, false)
    );

  }

}


/* =========================================================
   RENDER HAND
========================================================= */

function renderCurrentHand() {

  playerHand.innerHTML = "";

  if (!game.started) {

    $("currentPlayerTitle").textContent =
      "Player 1";

    $("handInstruction").textContent =
      "Press Start Game";

    return;
  }

  /*
    In this same-device prototype,
    current player's hand is displayed.

    In the future multiplayer version,
    each device will receive ONLY its own hand.
  */

  let playerIndex = 0;

  if (
    game.phase === "bidding" &&
    game.biddingTurn !== null
  ) {

    playerIndex = game.biddingTurn;

  } else if (
    game.phase === "trump" &&
    game.trumpSelectionPlayer !== null
  ) {

    playerIndex = game.trumpSelectionPlayer;

  } else if (
    (
      game.phase === "playing" ||
      game.phase === "forcedTrump"
    ) &&
    game.currentTurn !== null
  ) {

    playerIndex = game.currentTurn;

  }

  const player = game.players[playerIndex];

  $("currentPlayerTitle").textContent =
    player.name;

  $("handInstruction").textContent =
    getHandInstruction(playerIndex);

  const playableIds =
    getPlayableCards(playerIndex)
      .map(card => card.id);

  /*
    Sort cards by suit then rank for cleaner UI.
  */

  const sortedHand = [...player.hand].sort(
    sortCards
  );

  for (const card of sortedHand) {

    const isPlayable =
      playableIds.includes(card.id);

    const element =
      createCardElement(card, isPlayable);

    element.addEventListener(
      "click",
      () => handleCardClick(card)
    );

    playerHand.appendChild(element);

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

  if (suitOrder[a.suit] !== suitOrder[b.suit]) {

    return suitOrder[a.suit] -
           suitOrder[b.suit];

  }

  return RANK_VALUE[b.rank] -
         RANK_VALUE[a.rank];

}


/* =========================================================
   CREATE CARD ELEMENT
========================================================= */

function createCardElement(card, playable) {

  const element = document.createElement("button");

  element.className = "card";

  if (
    card.suit === "hearts" ||
    card.suit === "diamonds"
  ) {

    element.classList.add("red");

  }

  if (playable) {

    element.classList.add("playable");

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

function getHandInstruction(playerIndex) {

  if (game.phase === "bidding") {

    return playerIndex === game.biddingTurn
      ? "Make your bid"
      : "Waiting for bidder";

  }

  if (game.phase === "trump") {

    return "Choose a hidden trump";

  }

  if (game.phase === "forcedTrump") {

    return "You showed trump. You must play trump.";

  }

  if (game.phase === "playing") {

    if (playerIndex !== game.currentTurn) {

      return "Waiting for your turn";

    }

    if (!game.leadSuit) {

      return "Lead any card";

    }

    if (hasSuit(playerIndex, game.leadSuit)) {

      return `Follow ${SUIT_NAME[game.leadSuit]}`;

    }

    if (!game.trumpRevealed) {

      return "No lead suit. Show trump or discard.";

    }

    return "No lead suit. Play any card.";

  }

  return "";

}


/* =========================================================
   CARD CLICK
========================================================= */

function handleCardClick(card) {

  if (game.phase === "forcedTrump") {

    attemptForcedTrump(card.id);

    return;
  }

  if (game.phase !== "playing") {

    return;
  }

  const playerIndex = game.currentTurn;

  /*
    If player has no lead suit and trump is hidden,
    clicking a card directly means they chose
    NOT to reveal trump.

    Therefore discard is allowed.
  */

  attemptPlayCard(card.id);

}


/* =========================================================
   ACTION PANELS
========================================================= */

function renderActionPanels() {

  biddingPanel.classList.toggle(
    "hidden",
    game.phase !== "bidding"
  );

  trumpPanel.classList.toggle(
    "hidden",
    game.phase !== "trump"
  );

  /*
    Trump Show panel is shown only when:
      - playing
      - current player has no lead suit
      - trump is still hidden
  */

  let canShowTrump = false;

  if (game.phase === "playing") {

    const playerIndex = game.currentTurn;

    if (
      game.leadSuit &&
      !hasSuit(playerIndex, game.leadSuit) &&
      !game.trumpRevealed
    ) {

      canShowTrump = true;

    }

  }

  trumpShowPanel.classList.toggle(
    "hidden",
    !canShowTrump
  );

  /*
    Bidding UI
  */

  if (game.phase === "bidding") {

    $("biddingPlayerText").textContent =
      `${getPlayerName(game.biddingTurn)}'s turn to bid.`;

    /*
      First bidder cannot pass.
    */

    const isOpeningBid =
      game.currentBid === null &&
      game.biddingTurn === game.biddingStarter;

    $("passButton").disabled = isOpeningBid;

    $("bidInput").min =
      game.currentBid === null
        ? MIN_BID
        : game.currentBid + 1;

  }

  /*
    Trump selection UI
  */

  if (game.phase === "trump") {

    $("trumpPlayerText").textContent =
      `${getPlayerName(game.trumpSelectionPlayer)} must select a hidden trump.`;

  }

  /*
    Forced trump
  */

  if (game.phase === "forcedTrump") {

    trumpShowPanel.classList.add("hidden");

  }

}


/* =========================================================
   MESSAGES
========================================================= */

function showMessage(message) {

  globalMessage.textContent = message;

}
function showMarriageNotification() {

  const notification = $("marriageNotification");

  if (!notification) {
    return;
  }

  notification.classList.remove("hidden");

  setTimeout(() => {

    notification.classList.add("hidden");

  }, 1000);

}

/* =========================================================
   EVENT LISTENERS
========================================================= */

startButton.addEventListener(
  "click",
  startGame
);


$("bidButton").addEventListener(
  "click",
  submitBid
);


$("passButton").addEventListener(
  "click",
  submitPass
);


$("showTrumpButton").addEventListener(
  "click",
  showTrump
);


$("discardButton").addEventListener(
  "click",
  enableDiscardMode
);


document
  .querySelectorAll(".suit-buttons button")
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
