import fs from 'node:fs';
import path from 'node:path';

import Item from '../game/entity/objects/item';

import { Modules } from '@kaetram/common/network';

import type Player from '../game/entity/character/player/player';

/**
 * Runeheart additions: zone previews (`/tp <zone>`) and redeemable codes (`/redeem <code>`).
 * Codes and who redeemed them live in JSON files outside the repository, so upcoming codes
 * stay secret and survive restarts (folder `RUNEHEART_DATA_DIR`, default `runeheart-data`
 * next to the server package).
 */

export interface Zone {
    name: string;
    x: number;
    y: number;
}

// Coordinates come from Kaetram's admin teleports and were checked in game.
export const Zones: Record<string, Zone> = {
    town: { name: 'the main town', x: 191, y: 166 },
    ice: { name: 'the ice village', x: 608, y: 332 },
    snow: { name: 'the misty snowlands', x: 526, y: 256 },
    mountain: { name: 'the mountain pass', x: 440, y: 312 },
    pink: { name: 'the pink forest', x: 685, y: 433 },
    castle: { name: 'the castle fountain', x: 290, y: 357 },
    hell: { name: 'the underworld', x: 1112, y: 787 },
    sewer: { name: 'the sewers', x: 1117, y: 709 },
    mushroom: { name: 'the mushroom grounds', x: 992, y: 631 },
    crystal: { name: 'the crystal cave', x: 886, y: 622 },
    skeletonking: { name: "the Skeleton King's lair", x: 120, y: 794 },
    dragon: { name: "the Forest Dragon's canyon", x: 457, y: 807 },
    queenant: { name: "the Queen Ant's nest", x: 591, y: 820 },
    pirate: { name: "the Pirate Captain's ship", x: 930, y: 752 },
    ogre: { name: "the Ogre Lord's camp", x: 342, y: 166 }
};

export const PREVIEW_SECONDS = 30;

// Players whose invincibility was granted by a preview (so we only remove what we added).
let previewAddedInvincible = new Map<string, boolean>();
export const PREVIEW_COOLDOWN_SECONDS = 120;

export interface Code {
    // Item keys from data/items.json and how many of each.
    items: [string, number][];
    // ISO date after which the code stops working. Empty means it never expires.
    expires?: string;
    // Optional limit on how many players can redeem it.
    maxUses?: number;
}

let dataDir = process.env.RUNEHEART_DATA_DIR || path.resolve(process.cwd(), 'runeheart-data'),
    codesFile = path.join(dataDir, 'codes.json'),
    redeemedFile = path.join(dataDir, 'redeemed.json');

function readJSON<T>(file: string, fallback: T): T {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
    } catch {
        return fallback;
    }
}

function writeJSON(file: string, data: unknown): void {
    fs.mkdirSync(dataDir, { recursive: true });

    let temporary = `${file}.tmp`;

    fs.writeFileSync(temporary, JSON.stringify(data, null, 4));
    fs.renameSync(temporary, file);
}

export function normaliseCode(code: string): string {
    return code.trim().toUpperCase();
}

/**
 * Teleports a player to a zone as a ghost for `PREVIEW_SECONDS`, then brings them back.
 */

export function startPreview(player: Player, key: string): void {
    let zone = Zones[key];

    if (!zone) return player.notify(`Unknown zone. Try: ${Object.keys(Zones).join(', ')}`);

    if (player.previewing) return player.notify('You are already taking a look somewhere.');

    if (player.inMinigame()) return player.notify('You cannot take a look while in a minigame.');

    let wait = Math.ceil(
        (player.lastPreview + PREVIEW_COOLDOWN_SECONDS * 1000 - Date.now()) / 1000
    );

    if (wait > 0) return player.notify(`You can take another look in ${wait} seconds.`);

    player.previewing = true;
    player.previewReturn = { x: player.x, y: player.y };
    player.lastPreview = Date.now();

    // Ghosts cannot be hurt; remember if they already were invincible (admins).
    previewAddedInvincible.set(player.instance, !player.status.has(Modules.Effects.Invincible));
    player.status.add(Modules.Effects.Invincible);

    player.teleport(zone.x, zone.y, true, false, true);
    player.notify(
        `You are taking a look at ${zone.name}. You are a ghost: you cannot fight or pick anything up. Returning in ${PREVIEW_SECONDS} seconds.`
    );

    player.previewTimeout = setTimeout(() => endPreview(player), PREVIEW_SECONDS * 1000);
}

/**
 * Brings a player back from a preview. Safe to call more than once.
 */

export function endPreview(player: Player, silent = false): void {
    if (!player.previewing) return;

    clearTimeout(player.previewTimeout);

    let back = player.previewReturn;

    player.previewing = false;
    player.previewReturn = undefined;
    player.previewTimeout = undefined;

    if (previewAddedInvincible.get(player.instance))
        player.status.remove(Modules.Effects.Invincible);

    previewAddedInvincible.delete(player.instance);

    if (back && !player.dead) player.teleport(back.x, back.y, true, false, true);

    if (!silent) player.notify('Welcome back! Reach this place yourself to explore it for real.');
}

/**
 * Gives the items of a code to a player, once per player name.
 */

export function redeem(player: Player, rawCode: string): void {
    if (player.previewing) return player.notify('Finish taking a look before redeeming a code.');

    let code = normaliseCode(rawCode),
        codes = readJSON<Record<string, Code>>(codesFile, {}),
        entry = codes[code];

    if (!entry) return player.notify('That code does not exist.');

    if (entry.expires && Date.now() > Date.parse(entry.expires))
        return player.notify('That code has expired.');

    let redeemed = readJSON<Record<string, string[]>>(redeemedFile, {}),
        users = redeemed[code] || [],
        name = player.username.toLowerCase();

    if (users.includes(name)) return player.notify('You already redeemed that code.');

    if (entry.maxUses && users.length >= entry.maxUses)
        return player.notify('That code has run out of uses.');

    let items = entry.items
        .map(([key, count]) => {
            let item = new Item(key, -1, -1, true, 1);

            item.count = Math.max(1, count || 1);

            return item;
        })
        .filter((item) => item.exists);

    if (items.length === 0) return player.notify('That code has no rewards right now.');

    if (!player.inventory.hasSpace(items.length))
        return player.notify(
            `Make room in your inventory first. This code needs ${items.length} free slot(s).`
        );

    for (let item of items) player.inventory.add(item);

    redeemed[code] = [...users, name];
    writeJSON(redeemedFile, redeemed);

    player.notify(`Code ${code} redeemed: ${items.map((item) => item.name).join(', ')}!`);
}

/**
 * Admin helper behind `/newcode CODE HOURS item[:count] ...`.
 */

export function createCode(player: Player, blocks: string[]): void {
    let [rawCode, hoursText, ...itemTexts] = blocks,
        hours = Number(hoursText);

    if (!rawCode || !Number.isFinite(hours) || itemTexts.length === 0)
        return player.notify('Usage: /newcode CODE HOURS item[:count] ... (HOURS 0 = never expires)');

    let items: [string, number][] = [];

    for (let text of itemTexts) {
        let [key, countText] = text.split(':'),
            item = new Item(key, -1, -1, true, 1);

        if (!item.exists) return player.notify(`No item with key ${key} exists.`);

        items.push([key, Math.max(1, Number(countText) || 1)]);
    }

    let code = normaliseCode(rawCode),
        codes = readJSON<Record<string, Code>>(codesFile, {});

    codes[code] = {
        items,
        expires: hours > 0 ? new Date(Date.now() + hours * 3_600_000).toISOString() : ''
    };

    writeJSON(codesFile, codes);

    player.notify(
        `Code ${code} created${hours > 0 ? `, valid for ${hours} hours` : ''}: ${items
            .map(([key, count]) => `${key} x${count}`)
            .join(', ')}`
    );
}

/**
 * Admin helper behind `/codes`: lists the active codes.
 */

export function listCodes(player: Player): void {
    let codes = readJSON<Record<string, Code>>(codesFile, {}),
        redeemed = readJSON<Record<string, string[]>>(redeemedFile, {}),
        active = Object.entries(codes).filter(
            ([, entry]) => !entry.expires || Date.now() <= Date.parse(entry.expires)
        );

    if (active.length === 0) return player.notify('There are no active codes.');

    for (let [code, entry] of active)
        player.notify(
            `${code}: ${entry.items.map(([key, count]) => `${key} x${count}`).join(', ')} | used ${
                (redeemed[code] || []).length
            }${entry.expires ? ` | until ${entry.expires.slice(0, 16).replace('T', ' ')} UTC` : ''}`
        );
}
