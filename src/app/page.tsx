import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Beaker, ClipboardList, AlertTriangle } from "lucide-react";
import Link from "next/link";

const labFeatures = [
  {
    href: "/products",
    title: "제품표준서",
    description: "1,571개 제품의 표준서, BOM, QC 규격, 제조공정 조회",
    icon: Package,
    count: "1,571",
    status: "ready",
  },
  {
    href: "/ingredients",
    title: "원료관리",
    description: "1,066개 원료의 성분, 규격, INCI명, CAS번호 조회",
    icon: Beaker,
    count: "1,066",
    status: "ready",
  },
  {
    href: "/standards",
    title: "시험규격",
    description: "4,040개 시험규격 및 QC 기준 관리",
    icon: ClipboardList,
    count: "4,040",
    status: "ready",
  },
  {
    href: "/allergen",
    title: "알러젠 계산",
    description: "EU 규정 기반 알러젠 라벨링 필요 여부 판단",
    icon: AlertTriangle,
    count: "81",
    status: "planned",
  },
];

export default function LabHomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">RISE LAB</h1>
        <p className="text-muted-foreground mt-2">
          화장품 제품표준서 및 원료 정보 통합 관리 시스템
        </p>
      </div>

      {/* 데이터 현황 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              총 제품
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,571</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              총 원료
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,066</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              BOM 레코드
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">22,524</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              QC 규격
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">32,736</div>
          </CardContent>
        </Card>
      </div>

      {/* 기능 카드 */}
      <div className="grid gap-6 md:grid-cols-2">
        {labFeatures.map((feature) => {
          const Icon = feature.icon;
          return (
            <Link key={feature.href} href={feature.href}>
              <Card className="h-full hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{feature.title}</CardTitle>
                        <CardDescription>{feature.description}</CardDescription>
                      </div>
                    </div>
                    {feature.status === "planned" && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                        예정
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">{feature.count}</span>개 데이터
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
