import {useEffect} from "react";
import {Layout} from "antd";
import AgentConversation from "@/pages/agent/AgentConversation.tsx";
import AgentTracePanel from "@/pages/agent/AgentTracePanel.tsx";
import {usePlatformSkills} from "@/pages/agent/usePlatformSkills.ts";
import {useAgentRun} from "@/pages/agent/useAgentRun.ts";
import "./agent.css";

const {Content, Sider} = Layout;

export default function AgentPage() {
    const {skills, loading, selectedSkillId, setSelectedSkillId, loadSkills} = usePlatformSkills();
    const run = useAgentRun(selectedSkillId);

    useEffect(() => {
        void loadSkills();
    }, [loadSkills]);

    return (
        <div className="agent-page">
            <Layout className="agent-page-layout" style={{height: "100%"}}>
                <Content className="agent-main">
                    <AgentConversation
                        skills={skills}
                        skillsLoading={loading}
                        selectedSkillId={selectedSkillId}
                        onSkillChange={setSelectedSkillId}
                        messages={run.messages}
                        input={run.input}
                        running={run.running}
                        onInputChange={run.setInput}
                        onSend={() => void run.onSend()}
                        onStop={run.onStop}
                    />
                </Content>
                <Sider width={300} theme="light" className="agent-trace-sider">
                    <AgentTracePanel items={run.trace} status={run.status} runId={run.activeRunId} />
                </Sider>
            </Layout>
        </div>
    );
}
