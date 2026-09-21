import {expect, test, type Page} from '@playwright/test';
import {mkdirSync} from 'node:fs';
const output = 'reports/browser/story-experience-20260921';
mkdirSync(output, {recursive:true});
const button = (page: Page, name: string) => page.getByRole('button', {name, exact:true});
const state = (page: Page) => page.evaluate(() => {
  const test = (window as any).__simulationTest, s = test.state();
  return {focused:s.focused, director:s.director, phase:s.phase, actor:s.actor, paused:s.paused, progress:s.playbackProgress, world:test.world(), positions:test.positions(), poses:test.poses()};
});
async function ready(page: Page) {
  await page.goto('/');
  await page.waitForFunction(() => (window as any).__gardenTest?.state().loaded);
  await button(page,'世界推演').click();
  await page.waitForFunction(() => Object.values((window as any).__simulationTest?.poses() ?? {}).length === 4 && Object.values((window as any).__simulationTest.poses()).every((joints: any) => joints.every(Boolean)));
}

test('articulated actors follow real paths, pause, roll back and show a reading action', async ({page}) => {
  test.setTimeout(180000);
  const errors: string[] = [], requests: string[] = [];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>requests.push(new URL(request.url()).pathname));
  await page.goto('/');
  await page.waitForFunction(() => (window as any).__gardenTest?.state().loaded);
  expect(requests.filter(url=>url.startsWith('/models/characters/'))).toEqual([]);
  await button(page,'世界推演').click();
  await page.waitForFunction(() => (window as any).__simulationTest?.poses().wangxifeng[0]);
  expect(new Set(requests.filter(url=>url.startsWith('/models/characters/'))).size).toBe(4);
  await button(page,'临场').click();
  const before = await state(page);
  await button(page,'继续故事').click();
  await page.waitForFunction(() => (window as any).__simulationTest.state().playbackProgress > .15);
  const walking = await state(page);
  expect(walking.actor).toBe('baoyu');
  expect(walking.positions.baoyu).not.toEqual(before.positions.baoyu);
  expect(walking.world.agents.baoyu.spot).not.toBe('court');
  expect(Math.abs(walking.poses.baoyu[3][0]) + Math.abs(walking.poses.baoyu[4][0])).toBeGreaterThan(.01);
  expect(walking.poses.baoyu[1][0] * walking.poses.baoyu[3][0]).toBeLessThan(0);
  expect(walking.poses.baoyu[2][0] * walking.poses.baoyu[4][0]).toBeLessThan(0);
  await button(page,'暂停').click();
  const frozen = await state(page);
  await page.waitForTimeout(400);
  const afterPause = await state(page);
  expect(afterPause.positions).toEqual(frozen.positions);
  expect(afterPause.poses).toEqual(frozen.poses);
  expect(afterPause.progress).toBe(frozen.progress);
  await page.screenshot({path:`${output}/verified-walking.png`});
  await button(page,'撤销本步').click();
  await expect.poll(async()=>(await state(page)).phase).toBe('ready');
  await expect.poll(async()=>(await state(page)).positions).toEqual(before.positions);
  expect((await state(page)).world.tick).toBe(0);
  await button(page,'关闭推演提示').click();
  await page.locator('.sim-scroll').getByRole('button',{name:'4×',exact:true}).click();
  await button(page,'继续故事').click();
  await page.waitForFunction(() => (window as any).__simulationTest.state().actor==='daiyu');
  expect((await state(page)).focused).toBe('daiyu');
  await page.locator('.sim-stage-roster').getByRole('button',{name:'贾宝玉',exact:true}).click();
  expect((await state(page)).director).toBe(false);
  await button(page,'剧情跟拍').click();
  const resumed = await state(page);
  expect(resumed.director).toBe(true);expect(resumed.focused).toBe(resumed.actor);
  await page.waitForFunction(() => (window as any).__simulationTest.state().phase==='ready');
  expect((await state(page)).world.tick).toBe(1);
  await page.locator('.sim-scroll').getByRole('button',{name:'1×',exact:true}).click();
  await button(page,'继续故事').click();
  await page.waitForFunction(() => (window as any).__simulationTest.state().playback?.command.action.action==='read' && (window as any).__simulationTest.state().playbackProgress>.3);
  await button(page,'暂停').click();
  const book = await page.evaluate(() => {
    const scene=(window as any).__gardenTest.scene;
    return {visible:scene.getObjectByName('baoyu_book').visible, brush:scene.getObjectByName('baoyu_brush').visible, bow:scene.getObjectByName('baoyu_head').rotation.x, arm:scene.getObjectByName('baoyu_leftArm').rotation.x};
  });
  expect(book).toMatchObject({visible:true,brush:false});expect(book.bow).toBeGreaterThan(.1);expect(book.arm).toBeLessThan(-.3);
  await expect(page.getByLabel('当前人物行动')).toContainText('展卷细读');
  await page.screenshot({path:`${output}/verified-reading.png`});
  await button(page,'继续本步').click();
  await page.locator('.sim-scroll').getByRole('button',{name:'4×',exact:true}).click();
  await page.waitForFunction(() => (window as any).__simulationTest.state().phase==='ready');
  expect((await state(page)).world.tick).toBe(2);
  await expect(page.locator('.sim-moment')).toBeVisible();
  expect(errors).toEqual([]);
});

test('phone play entry records a conversation, completes an invitation, and keeps figures above controls', async ({page}) => {
  test.setTimeout(210000);
  await page.setViewportSize({width:390,height:844});
  await ready(page);
  await page.getByRole('button',{name:/竹下问安/}).click();
  await page.getByLabel(/^想对/).fill('今日竹影正好，你可想歇一歇？');
  await button(page,'说给他听').click();
  await page.waitForFunction(() => (window as any).__simulationTest.world().conversations?.length === 1);
  const conversation = (await state(page)).world.conversations[0];
  expect(conversation.agent).toBe('daiyu');expect(conversation.reply.length).toBeGreaterThan(10);
  await button(page,'园中纪事').click();
  await expect(page.locator('.sim-playbook-steps li').first()).toHaveAttribute('data-complete','true');
  await page.getByRole('button',{name:/邀一席茶/}).click();
  expect((await state(page)).world.gathering.status).toBe('pending');
  await page.locator('.sim-scroll').getByRole('button',{name:'4×',exact:true}).click();
  for(let step=0;step<6&&(await state(page)).world.gathering.status==='pending';step++) {
    await button(page,'继续这场小聚').click();
    await page.waitForFunction(() => (window as any).__simulationTest.state().phase==='ready');
  }
  expect((await state(page)).world.gathering.status).toBe('completed');
  expect((await state(page)).director).toBe(true);
  expect((await state(page)).world.gathering.participants).toContain((await state(page)).focused);
  expect(await page.evaluate(() => ['baoyu','daiyu','baochai'].every(id => (window as any).__gardenTest.scene.getObjectByName(id+'_teaCup')))).toBe(true);
  await expect(page.locator('.dream-toast')).toHaveCount(0);
  await page.screenshot({path:`${output}/verified-phone-gathering.png`});
  await button(page,'入园沉浸').click();
  await page.locator('.sim-stage-roster').getByRole('button',{name:'林黛玉',exact:true}).click();
  await button(page,'临场').click();
  await page.waitForTimeout(1300);
  for(const width of [390,320]) {
    await page.setViewportSize({width,height:844});await page.waitForTimeout(1100);
    expect(await page.evaluate(() => document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const framed=await page.evaluate(() => {
      const t=(window as any).__gardenTest,s=(window as any).__simulationTest.state(),obj=t.scene.getObjectByName('simulation-'+s.focused),canvas=document.querySelector('canvas')!.getBoundingClientRect(),panel=document.querySelector('.sim-stage-bottom')!.getBoundingClientRect();
      const foot=obj.position.clone().project(t.camera),head=obj.position.clone();head.y+=1.95;head.project(t.camera);
      return {x:canvas.left+(foot.x+1)/2*canvas.width,foot:canvas.top+(1-foot.y)/2*canvas.height,head:canvas.top+(1-head.y)/2*canvas.height,panel:panel.top,roster:document.querySelector('.sim-stage-roster')!.getBoundingClientRect().bottom};
    });
    expect(framed.x).toBeGreaterThan(20);expect(framed.x).toBeLessThan(width-20);
    expect(framed.foot).toBeLessThan(framed.panel+6);expect(framed.head).toBeGreaterThan(framed.roster-5);
    expect(await button(page,'下一刻').evaluate(el=>{const box=el.getBoundingClientRect();return el.contains(document.elementFromPoint(box.x+box.width/2,box.y+box.height/2));})).toBe(true);
    await page.screenshot({path:`${output}/verified-phone-${width}.png`});
  }
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(250);
  const still=(await state(page)).poses;await page.waitForTimeout(350);expect((await state(page)).poses).toEqual(still);
  const saved=(await state(page)).world;
  await page.reload();await page.waitForFunction(() => (window as any).__gardenTest?.state().loaded);await button(page,'世界推演').click();
  expect((await state(page)).world).toEqual(saved);
});

test('a failed character download can be retried without losing the garden or saved world', async ({page}) => {
  let attempts = 0;
  await page.route('**/models/characters/baoyu.glb',route=>++attempts===1?route.abort('failed'):route.continue());
  await page.goto('/');await page.waitForFunction(() => (window as any).__gardenTest?.state().loaded);
  await button(page,'世界推演').click();
  const retry=button(page,'人物暂未载入 · 重试');
  await expect(retry).toBeVisible();
  const before=(await state(page)).world;
  await retry.click();
  await page.waitForFunction(() => (window as any).__simulationTest?.poses().baoyu.every(Boolean));
  await expect(retry).toHaveCount(0);expect(attempts).toBe(2);
  expect((await state(page)).world).toEqual(before);
  expect(await page.locator('.canvas-wrap').getAttribute('data-scene-ready')).toBe('true');
});
