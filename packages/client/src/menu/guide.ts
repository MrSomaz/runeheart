/**
 * Runeheart quick guide: a few small cards that explain the game to new players.
 * Shown once after the welcome window closes, and again from the "?" button.
 */

interface Card {
    icon: string;
    title: string;
    text: string;
}

let Cards: Card[] = [
    {
        icon: '❤',
        title: 'Welcome to Runeheart',
        text: 'An old heart of runes kept this world alive until it shattered. Explore, fight and grow stronger to find its pieces.'
    },
    {
        icon: '➜',
        title: 'Moving around',
        text: 'Walk with <b>W A S D</b> or the <b>arrow keys</b>, or simply <b>click</b> where you want to go.'
    },
    {
        icon: '⚔',
        title: 'Fighting',
        text: 'Click a monster to attack it. Keep an eye on your <b>red health bar</b> at the top left and eat food to heal.'
    },
    {
        icon: '⛏',
        title: 'Skills',
        text: 'Chop trees, mine rocks, fish, cook and smith. Every skill levels up on its own the more you use it.'
    },
    {
        icon: '!',
        title: 'Quests',
        text: 'People with a <b>marker over their head</b> have work for you. Click them to talk. Quests open new places and give rewards.'
    },
    {
        icon: '⛨',
        title: 'Gear',
        text: 'Open your bag with the buttons at the bottom right and <b>click an item to wear it</b>. Bosses, shops and crafting give better gear.'
    },
    {
        icon: '👁',
        title: 'Take a look',
        text: 'Curious about a far away land? Type <b>/tp ice</b> in the chat for a 30 second ghost visit. Type <b>/zones</b> to see them all.'
    },
    {
        icon: '🎁',
        title: 'Free gifts',
        text: 'We post new codes every few days. Press <b>Enter</b> and type <b>/redeem CODE</b> to claim free outfits.'
    }
];

let STORAGE_KEY = 'runeheart-guide-seen';

export default class Guide {
    private root!: HTMLDivElement;
    private icon!: HTMLDivElement;
    private title!: HTMLDivElement;
    private text!: HTMLDivElement;
    private dots!: HTMLDivElement;
    private back!: HTMLButtonElement;
    private next!: HTMLButtonElement;

    private index = 0;

    public constructor() {
        this.build();
        this.buildHelpButton();
    }

    /**
     * Shows the guide only the first time on this browser.
     */

    public showFirstTime(): void {
        let seen = false;

        try {
            seen = localStorage.getItem(STORAGE_KEY) === '1';
        } catch {
            seen = false;
        }

        if (!seen) this.show();
    }

    public show(): void {
        this.index = 0;
        this.render();
        this.root.style.display = 'flex';
    }

    public hide(): void {
        this.root.style.display = 'none';

        try {
            localStorage.setItem(STORAGE_KEY, '1');
        } catch {
            // Storage can be blocked; the guide just shows again next time.
        }
    }

    private render(): void {
        let card = Cards[this.index];

        this.icon.textContent = card.icon;
        this.title.textContent = card.title;
        this.text.innerHTML = card.text;

        this.dots.innerHTML = Cards.map(
            (_card, i) =>
                `<span style="display:inline-block;width:8px;height:8px;margin:0 3px;background:${
                    i === this.index ? '#f4d35e' : '#4a5372'
                }"></span>`
        ).join('');

        this.back.style.visibility = this.index === 0 ? 'hidden' : 'visible';
        this.next.textContent = this.index === Cards.length - 1 ? 'Play!' : 'Next';
    }

    private build(): void {
        let button =
            'font-family:AdvoCut,monospace;font-size:14px;padding:8px 14px;cursor:pointer;border:3px solid #0b0d16;';

        this.root = document.createElement('div');
        this.root.id = 'runeheart-guide';
        this.root.style.cssText =
            'position:fixed;inset:0;z-index:1000;display:none;align-items:center;justify-content:center;background:rgba(5,7,15,0.55);';

        this.root.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:stretch;width:min(360px,calc(100vw - 32px));background:#1b2033;border:4px solid #c9a227;box-shadow:0 0 0 4px #0b0d16;padding:18px 18px 14px;color:#e8ecff;font-family:AdvoCut,monospace;text-align:center;image-rendering:pixelated">
                <div data-g="icon" style="font-size:40px;line-height:1;color:#f4d35e;margin-bottom:8px"></div>
                <div data-g="title" style="font-size:20px;color:#f4d35e;margin-bottom:10px"></div>
                <div data-g="text" style="font-size:14px;line-height:1.5;min-height:84px;display:block"></div>
                <div data-g="dots" style="display:flex;flex-direction:row;justify-content:center;margin:12px 0"></div>
                <div style="display:flex;flex-direction:row;justify-content:space-between;align-items:center;gap:8px">
                    <button data-g="back" style="${button}background:#2c3350;color:#e8ecff">Back</button>
                    <button data-g="skip" style="font-family:AdvoCut,monospace;font-size:12px;background:none;border:none;color:#8f98b8;cursor:pointer">Skip</button>
                    <button data-g="next" style="${button}background:#c9a227;color:#1b1206">Next</button>
                </div>
            </div>`;

        let get = <T extends HTMLElement>(key: string) =>
            this.root.querySelector(`[data-g="${key}"]`) as T;

        this.icon = get('icon');
        this.title = get('title');
        this.text = get('text');
        this.dots = get('dots');
        this.back = get('back');
        this.next = get('next');

        this.back.addEventListener('click', () => {
            this.index = Math.max(0, this.index - 1);
            this.render();
        });

        this.next.addEventListener('click', () => {
            if (this.index >= Cards.length - 1) return this.hide();

            this.index++;
            this.render();
        });

        get('skip').addEventListener('click', () => this.hide());

        // Keep clicks and keys inside the guide from reaching the game.
        for (let type of ['click', 'mousedown', 'mouseup', 'touchstart', 'keydown'])
            this.root.addEventListener(type, (event) => event.stopPropagation());

        document.body.append(this.root);
    }

    private buildHelpButton(): void {
        let help = document.createElement('button');

        help.id = 'runeheart-guide-button';
        help.title = 'How to play';
        help.textContent = '?';
        help.style.cssText =
            'position:fixed;left:12px;bottom:12px;z-index:90;width:34px;height:34px;font-family:AdvoCut,monospace;font-size:20px;background:#1b2033;color:#f4d35e;border:3px solid #c9a227;cursor:pointer;display:none';

        help.addEventListener('click', (event) => {
            event.stopPropagation();
            this.show();
        });

        document.body.append(help);
    }

    /**
     * The "?" button only makes sense once the player is in the game.
     */

    public showHelpButton(): void {
        let help = document.querySelector<HTMLButtonElement>('#runeheart-guide-button');

        if (help) help.style.display = 'block';
    }
}
