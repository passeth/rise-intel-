import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Construction } from "lucide-react";

export default function LabStandardsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">시험규격</h1>
        <p className="text-muted-foreground mt-1">
          QC 시험규격 및 기준 관리
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Construction className="h-5 w-5" />
            구현 예정
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>이 페이지에 구현될 기능:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>시험규격 목록 (검색, 필터)</li>
              <li>규격별 적용 제품 조회</li>
              <li>시험방법 상세</li>
              <li>기준치 및 허용범위</li>
            </ul>

            <div className="mt-6 p-4 bg-muted rounded-lg">
              <p className="font-medium">데이터 현황</p>
              <ul className="mt-2 space-y-1">
                <li>• labdoc_test_specs: 4,040개</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
