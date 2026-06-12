import {Empty} from "antd";

/** Studio 编排工作台占位页，避免 appRegistry lazy 加载失败导致桌面壳无法启动 */
export default function StudioPage() {
    return (
        <div className="studio-page studio-page--placeholder">
            <Empty description="Studio 工作台开发中，请稍后再试" />
        </div>
    );
}
