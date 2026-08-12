export enum Suit {
  Clubs = "clubs",
  Diamonds = "diamonds",
  Hearts = "hearts",
  Spades = "spades",
}

export enum Rank {
  Two = 2, Three = 3, Four = 4, Five = 5, Six = 6, Seven = 7,
  Eight = 8, Nine = 9, Ten = 10, Jack = 11, Queen = 12, King = 13, Ace = 14,
}

export interface Card {
  rank: Rank;
  suit: Suit;
}

export class deck {
    private cards: Card[];

    constructor() {
        this.cards = this.Buildfulldeck();
    }
  
    private Buildfulldeck(): Card[] {
        const deck: Card[] = [];
        for (const suit of Object.values(Suit)){
            for (const rank of [2,3,4,5,6,7,8,9,10,11,12,13,14] as Rank[]){
                deck.push({suit, rank})
            }
        }
        return deck;
    }

    private shuffle(): void {
        for(let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    draw(count: number = 1): Card[] {
        return this.cards.splice(0, count);
    }

    remaining(): number {
        return this.cards.length;
    }
}

