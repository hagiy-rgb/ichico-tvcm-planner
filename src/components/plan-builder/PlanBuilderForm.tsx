"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpButton } from "@/components/ui/help-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { listAreas, listTargetsForArea } from "@/lib/masters/area-master";
import { listIndustries } from "@/lib/masters/industry-master";
import { useSimulationStore } from "@/lib/stores/simulation-store";

export function PlanBuilderForm() {
  const input = useSimulationStore((s) => s.input);
  const setArea = useSimulationStore((s) => s.setArea);
  const setTarget = useSimulationStore((s) => s.setTarget);
  const setIndustryCode = useSimulationStore((s) => s.setIndustryCode);
  const setGrp = useSimulationStore((s) => s.setGrp);
  const setCampaignWeeks = useSimulationStore((s) => s.setCampaignWeeks);
  const setGrpAllocation = useSimulationStore((s) => s.setGrpAllocation);
  const setCmLength = useSimulationStore((s) => s.setCmLength);

  const areas = useMemo(() => listAreas(), []);
  const targets = useMemo(
    () => listTargetsForArea(input.area),
    [input.area],
  );
  const industries = useMemo(() => listIndustries(), []);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Step 1: エリア・条件</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="area">エリア</Label>
            <Select
              id="area"
              value={input.area}
              onChange={(area) => {
                setArea(area);
                const nextTargets = listTargetsForArea(area);
                if (nextTargets.length > 0) {
                  setTarget(nextTargets[0]);
                }
              }}
              className="mt-1"
            >
              {areas.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="target">ターゲット</Label>
            <Select
              id="target"
              value={input.target}
              onChange={setTarget}
              className="mt-1"
            >
              {targets.map((target) => (
                <option key={target} value={target}>
                  {target}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="industry">業界カテゴリ</Label>
            <Select
              id="industry"
              value={input.industryCode}
              onChange={setIndustryCode}
              className="mt-1"
            >
              {industries.map((ind) => (
                <option key={ind.code} value={ind.code}>
                  {ind.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="cm-length">CM秒数</Label>
            <Select
              id="cm-length"
              value={String(input.cmLength)}
              onChange={(v) => setCmLength(Number(v) as 15 | 30 | 60)}
              className="mt-1"
            >
              <option value="15">15秒</option>
              <option value="30">30秒</option>
              <option value="60">60秒</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Step 2: 出稿量・期間</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div>
            <div className="flex items-center gap-1">
              <Label htmlFor="grp">GRP（合計）</Label>
              <HelpButton termId="grp" />
            </div>
            <Input
              id="grp"
              type="number"
              value={input.grp}
              min={0}
              step={10}
              onChange={(v) => setGrp(Number(v) || 0)}
              className="mt-1"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="campaign-weeks">出稿週数</Label>
              <Input
                id="campaign-weeks"
                type="number"
                value={input.campaignWeeks}
                min={1}
                max={52}
                step={1}
                onChange={(v) => setCampaignWeeks(Number(v) || 1)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="grp-allocation">GRP配分</Label>
              <Select
                id="grp-allocation"
                value={input.grpAllocation}
                onChange={(v) =>
                  setGrpAllocation(v as "lump_sum" | "even_weekly")
                }
                className="mt-1"
              >
                <option value="even_weekly">週あたり均等</option>
                <option value="lump_sum">初週に集中</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
