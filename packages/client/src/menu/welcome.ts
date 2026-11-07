import Menu from './menu';
import Guide from './guide';

import Updates from '@kaetram/common/text/updates.json';
import { Modules } from '@kaetram/common/network';

import type Game from '../game';

export default class Welcome extends Menu {
    public override identifier: number = Modules.Interfaces.Welcome;

    private changelog: HTMLUListElement = document.querySelector('#welcome-changelog > ul')!;

    public guide = new Guide();

    public constructor(private game: Game) {
        super('#welcome', '#close-welcome');
    }

    /**
     * Override for the show function to include loading the necessary data such as
     * change log and the player's information.
     */

    public override show(): void {
        super.show();

        this.loadChangelog();
        this.guide.showHelpButton();
    }

    /**
     * Runeheart: after the welcome window closes, new players get the quick guide.
     */

    public override hide(): void {
        let wasVisible = this.isVisible();

        super.hide();

        if (wasVisible) this.guide.showFirstTime();
    }

    /**
     * Iterates through the update file and adds all the new updates to the changelog.
     */

    private loadChangelog(): void {
        // Clear the change log.
        this.changelog.innerHTML = '';

        let update = Updates[this.game.app.config.version as keyof typeof Updates];

        if (!update) return;

        let title = (document.createElement('li').innerHTML = update.title);

        this.changelog.append(title);

        // Iterate through the content of the update.
        for (let change of update.content) {
            let element = document.createElement('li');

            element.innerHTML = change;

            this.changelog.append(element);
        }
    }
}
