import type {Page} from '@playwright/test';
export function toolAction(page: Page, name: string): Promise<void>;
export function recordAction(page: Page, name: string): Promise<void>;
export function viewAction(page: Page, name: string): Promise<void>;
export function cameraAction(page: Page, name: string): Promise<void>;
export function chooseSpeed(page: Page, name: string): Promise<void>;
export function inspectPerson(page: Page): Promise<void>;
