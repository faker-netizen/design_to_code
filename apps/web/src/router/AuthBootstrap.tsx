import {useEffect, useState} from "react";
import {Outlet} from "react-router-dom";
import {Spin} from "antd";
import {ensureGuestSession} from "@/service/guestSession.ts";

/** C 端：进入应用前确保有访客或已登录 token，不强制跳转 /login */
export default function AuthBootstrap() {
    const [ready, setReady] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        void ensureGuestSession()
            .then(() => {
                if (!cancelled) setReady(true);
            })
            .catch((e) => {
                if (!cancelled) {
                    setError(e instanceof Error ? e.message : "初始化失败");
                }
            });
        return () => {
            cancelled = true;
        };
    }, []);

    if (error) {
        return (
            <div className="auth-bootstrap-error">
                <p>无法连接服务，请稍后刷新</p>
                <p style={{opacity: 0.65, fontSize: 13}}>{error}</p>
            </div>
        );
    }

    if (!ready) {
        return (
            <div className="auth-bootstrap-loading">
                <Spin size="large" tip="加载中…" />
            </div>
        );
    }

    return <Outlet />;
}
