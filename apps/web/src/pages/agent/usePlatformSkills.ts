import {useCallback, useState} from "react";
import {message} from "antd";
import {listPlatformSkills} from "@/pages/agent/platformApi.ts";
import type {PlatformSkillItem} from "@/pages/agent/agentTypes.ts";

const DEFAULT_SKILL_ID = "open-research";

export function usePlatformSkills() {
    const [skills, setSkills] = useState<PlatformSkillItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedSkillId, setSelectedSkillId] = useState<string>(DEFAULT_SKILL_ID);

    const loadSkills = useCallback(async () => {
        setLoading(true);
        try {
            const list = await listPlatformSkills();
            setSkills(list);
            if (list.length && !list.some((s) => s.id === selectedSkillId)) {
                setSelectedSkillId(list[0].id);
            }
        } catch {
            message.error("加载 Skill 失败");
        } finally {
            setLoading(false);
        }
    }, [selectedSkillId]);

    const selectedSkill = skills.find((s) => s.id === selectedSkillId) ?? null;

    return {
        skills,
        loading,
        selectedSkillId,
        setSelectedSkillId,
        selectedSkill,
        loadSkills,
    };
}
