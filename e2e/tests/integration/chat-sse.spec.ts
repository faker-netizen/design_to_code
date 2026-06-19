import {expect, test} from "@playwright/test";
import {loginViaApi} from "../../helpers/auth";
import {getE2eCredentials} from "../../helpers/env";
import {buildMockChatUiStreamBody, MOCK_REPLY} from "../../helpers/mockChatUiStream";

test.describe("聊天 AI SDK 流 @integration", () => {
    test.beforeEach(({page: _page}, testInfo) => {
        if (!getE2eCredentials()) {
            testInfo.skip(true, "缺少 E2E_USER_EMAIL / E2E_USER_PASSWORD");
        }
    });

    test.beforeEach(async ({page, request}) => {
        await loginViaApi(page, request);

        await page.route("**/api/chat/sessions/*/messages", async (route) => {
            if (route.request().method() !== "POST") {
                await route.continue();
                return;
            }
            await route.fulfill({
                status: 200,
                headers: {
                    "Content-Type": "text/event-stream",
                    "Cache-Control": "no-cache",
                    "x-vercel-ai-ui-message-stream": "v1",
                },
                body: buildMockChatUiStreamBody(),
            });
        });
    });

    test("发送消息后展示 mock 流式回复", async ({page}) => {
        await page.getByTitle("RAG 对话").click();
        await expect(page.getByText("RAG 对话", {exact: true}).first()).toBeVisible();

        await page.getByRole("button", {name: "新建会话"}).click();
        const dialog = page.getByRole("dialog", {name: "新建会话"});
        await expect(dialog).toBeVisible();
        await dialog.getByRole("button", {name: "OK"}).click();
        await expect(dialog).toBeHidden({timeout: 10_000});

        const userText = `E2E chat ${Date.now()}`;
        await page.getByPlaceholder("输入消息，Enter 发送（Shift+Enter 换行）").fill(userText);
        await page.getByRole("button", {name: "发送"}).click();

        await expect(page.getByText(userText)).toBeVisible({timeout: 10_000});
        await expect(page.getByText(MOCK_REPLY)).toBeVisible({timeout: 15_000});
    });
});
