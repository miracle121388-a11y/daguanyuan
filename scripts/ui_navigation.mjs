// Shared UI paths for acceptance scripts after secondary actions were grouped.
async function expand(page, selector) {
  const details = page.locator(selector);
  if (await details.getAttribute('open') === null) await details.locator(':scope > summary').click();
}
export async function toolAction(page, name) {
  await expand(page, '.workspace-more');
  await page.locator('.workspace-more').getByRole('button', {name, exact: true}).click();
}
export async function recordAction(page, name) {
  await expand(page, '.sim-records-more');
  await page.locator('.sim-records-more').getByRole('button', {name, exact: true}).click();
}
export async function viewAction(page, name) {
  await expand(page, '.garden-view-tools .action-disclosure');
  await page.locator('.garden-view-tools').getByRole('button', {name, exact: true}).click();
}
export async function cameraAction(page, name) {
  await expand(page, '.sim-stage-views');
  await page.locator('.sim-stage-views').getByRole('button', {name, exact: true}).click();
}
export async function chooseSpeed(page, name) {
  await expand(page, '.sim-options');
  await page.locator('.sim-options').getByRole('button', {name, exact: true}).click();
  await page.locator('.sim-options > summary').click();
}
export async function inspectPerson(page) {
  await page.getByRole('button', {name: '入局互动', exact: true}).click();
  await page.getByRole('button', {name: '与他交谈', exact: true}).click();
  await page.getByRole('button', {name: '托付与追问', exact: true}).click();
}
