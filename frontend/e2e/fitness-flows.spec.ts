import { test, expect } from '@playwright/test';

test.describe('Fitness Tracker E2E Flows', () => {

  test('User can create a routine template, run it, and see it in history', async ({ page }) => {
    await page.goto('/');
    //Create Workout Template
    await page.getByTestId('create-template-btn').click();

    //Fill out workout template form and save
    await page.fill('input[placeholder="Routine Name..."]', 'Hypertrophy Push Day');
    await page.click('button:has-text("Add")');
    await page.fill('input[placeholder="Exercise..."]', 'Barbell Bench Press');

    await page.getByTestId('save-session-btn').click();

    //Start workout - wait for template to appear then click its Start button
    await page.locator('[data-testid^="start-workout-"]').first().click();
    await expect(page.getByText('Active Session')).toBeVisible();

    //Log the session
    await page.getByTestId('save-session-btn').click();

    //Check History for completed session
    await page.getByTestId('nav-history').click();
    await expect(page.locator('text=Hypertrophy Push Day').first()).toBeVisible();
  });

  test('User can set a goal and log a recommended exercise', async ({ page }) => {
    await page.goto('/');
    //Set a Goal
    await page.getByTestId('nav-goals').click();
    await page.click('button:has-text("+ Goal")');
    await page.getByText('Cardiovascular Endurance').first().click();
    await page.click('button:has-text("Save Goal")');

    //Go to Suggestions, add recommended exercise, and log session
    await page.getByTestId('nav-suggestions').click();
    await page.waitForSelector('button:has-text("Add")', { timeout: 30000 });
    await page.locator('button:has-text("Add")').first().click();

    //Start workout
    await page.locator('[data-testid^="start-workout-"]').first().click();
    await expect(page.getByText('Active Session')).toBeVisible();

    //Log the session
    await page.getByTestId('save-session-btn').click();

    //Check History for completed session
    await page.getByTestId('nav-history').click();
    await expect(page.locator('text=Cardiovascular Endurance Session').first()).toBeVisible();
  });

});