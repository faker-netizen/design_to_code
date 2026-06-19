import {useState} from "react";
import {Button, message} from "antd";
import {PlusOutlined} from "@ant-design/icons";
import CreateKnowledgeBaseModal from "@/components/knowledge-base/CreateKnowledgeBaseModal.tsx";
import {useCreateKnowledgeBase} from "@/hooks/useKnowledgeBaseList.ts";
import {logout} from "@/service/authService.ts";
import {resetToGuestSession} from "@/service/guestSession.ts";
import {isGuestSession} from "@/service/token.ts";
import {useDesktopKnowledgeBases} from "./desktopKnowledgeBaseContext.ts";
import {useWindowManager} from "./useWindowManager.ts";
import MenuBarAuth from "./MenuBarAuth.tsx";

export default function MenuBar() {
    const {refresh} = useDesktopKnowledgeBases();
    const {openKnowledgeBase} = useWindowManager();
    const [createOpen, setCreateOpen] = useState(false);
    const guest = isGuestSession();
    const {create, submitting} = useCreateKnowledgeBase();

    const onCreateSubmit = async (name: string, description?: string) => {
        try {
            const id = await create(name, description);
            message.success("知识库已创建");
            setCreateOpen(false);
            const list = await refresh();
            const kb = list.find((k) => k.id === id);
            if (kb) openKnowledgeBase({id: kb.id, name: kb.name});
        } catch (e) {
            message.error(e instanceof Error ? e.message : "创建失败");
            throw e;
        }
    };

    const onSignOut = async () => {
        try {
            await logout();
        } catch {
            /* 仍重置为访客 */
        }
        await resetToGuestSession();
        message.info(guest ? "已刷新访客会话" : "已退出，当前为访客模式");
    };

    return (
        <>
            <header className="desktop-menubar">
                <div className="desktop-menubar__brand">AI 工作台</div>
                <nav className="desktop-menubar__menu" aria-label="主菜单">
                    {!guest ? (
                        <Button
                            type="text"
                            size="small"
                            className="desktop-menubar__menu-item"
                            icon={<PlusOutlined />}
                            onClick={() => setCreateOpen(true)}
                        >
                            新建知识库
                        </Button>
                    ) : null}
                </nav>
                <div className="desktop-menubar__spacer" />
                <MenuBarAuth onSignOut={onSignOut} />
            </header>

            <CreateKnowledgeBaseModal
                open={createOpen}
                submitting={submitting}
                onCancel={() => setCreateOpen(false)}
                onSubmit={onCreateSubmit}
            />
        </>
    );
}
