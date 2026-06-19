import {Navigate, Outlet, useLocation} from "react-router-dom";
import {getAccessToken} from "@/service/token.ts";

/**
 * @deprecated C 端默认不强制登录；保留供需门禁的子路由可选使用。
 * 有 token（含访客）才渲染子路由，否则跳转登录。
 */
export default function RequireAuth() {
    const location = useLocation();
    if (!getAccessToken()) {
        return <Navigate to="/login" replace state={{from: location.pathname + location.search}} />;
    }
    return <Outlet />;
}
