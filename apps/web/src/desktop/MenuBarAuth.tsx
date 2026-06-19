import {Button} from "antd";
import {LoginOutlined} from "@ant-design/icons";
import {useNavigate} from "react-router-dom";
import {getAuthUser, isGuestSession} from "@/service/token.ts";

type MenuBarAuthProps = {
    onSignOut: () => void;
};

export default function MenuBarAuth({onSignOut}: MenuBarAuthProps) {
    const navigate = useNavigate();
    const guest = isGuestSession();
    const authUser = getAuthUser();

    if (guest) {
        return (
            <Button
                type="text"
                size="small"
                className="desktop-menubar__action"
                icon={<LoginOutlined />}
                onClick={() => navigate("/login")}
            >
                登录
            </Button>
        );
    }

    return (
        <>
            <span className="desktop-menubar__user" title={authUser?.email}>
                {authUser?.email ?? "已登录"}
            </span>
            <Button type="text" size="small" className="desktop-menubar__action" onClick={() => void onSignOut()}>
                退出
            </Button>
        </>
    );
}
