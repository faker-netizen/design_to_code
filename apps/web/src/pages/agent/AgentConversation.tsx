import {Button, Input, Select, Typography} from "antd";
import AgentMessageList from "@/pages/agent/AgentMessageList.tsx";
import type {PlatformSkillItem, AgentMessage} from "@/pages/agent/agentTypes.ts";

const {TextArea} = Input;
const {Text} = Typography;

type Props = {
    skills: PlatformSkillItem[];
    skillsLoading: boolean;
    selectedSkillId: string;
    onSkillChange: (id: string) => void;
    messages: AgentMessage[];
    input: string;
    running: boolean;
    onInputChange: (v: string) => void;
    onSend: () => void;
    onStop: () => void;
};

export default function AgentConversation(props: Props) {
    const {skills, skillsLoading, selectedSkillId, onSkillChange, messages, input, running} = props;

    return (
        <div className="agent-conversation">
            <div className="agent-conversation__toolbar">
                <Text type="secondary">Skill</Text>
                <Select
                    className="agent-conversation__skill"
                    loading={skillsLoading}
                    value={selectedSkillId}
                    onChange={onSkillChange}
                    options={skills.map((s) => ({value: s.id, label: s.name, title: s.description}))}
                />
            </div>

            <div className="agent-conversation__messages">
                <AgentMessageList messages={messages} running={running} />
            </div>

            <div className="agent-conversation__composer">
                <TextArea
                    value={input}
                    onChange={(e) => props.onInputChange(e.target.value)}
                    placeholder="输入任务…"
                    autoSize={{minRows: 2, maxRows: 6}}
                    disabled={running}
                    onPressEnter={(e) => {
                        if (!e.shiftKey) {
                            e.preventDefault();
                            props.onSend();
                        }
                    }}
                />
                <div className="agent-conversation__actions">
                    {running ? (
                        <Button danger onClick={props.onStop}>
                            停止
                        </Button>
                    ) : (
                        <Button type="primary" onClick={props.onSend} disabled={!input.trim()}>
                            运行
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
