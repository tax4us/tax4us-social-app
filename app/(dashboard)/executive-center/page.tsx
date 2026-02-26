"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Calendar, 
  Clock,
  CheckCircle2,
  AlertCircle,
  Target,
  Zap
} from "lucide-react";

interface ExecutiveMetrics {
  revenue: {
    current: number;
    target: number;
    growth: number;
  };
  clients: {
    active: number;
    new: number;
    retention: number;
  };
  content: {
    published: number;
    engagement: number;
    reach: number;
  };
  automation: {
    efficiency: number;
    cost_savings: number;
    uptime: number;
  };
}

interface KPI {
  id: string;
  title: string;
  value: string;
  change: number;
  target: string;
  status: 'on-track' | 'at-risk' | 'ahead';
}

export default function ExecutiveCenterPage() {
  const [metrics, setMetrics] = useState<ExecutiveMetrics | null>(null);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExecutiveData = async () => {
      try {
        // Simulate executive dashboard data
        setMetrics({
          revenue: {
            current: 125000,
            target: 150000,
            growth: 18.5
          },
          clients: {
            active: 89,
            new: 12,
            retention: 94.2
          },
          content: {
            published: 156,
            engagement: 87.3,
            reach: 45600
          },
          automation: {
            efficiency: 92.1,
            cost_savings: 28500,
            uptime: 99.7
          }
        });

        setKpis([
          {
            id: 'revenue',
            title: 'Monthly Revenue',
            value: '$125K',
            change: 18.5,
            target: '$150K',
            status: 'on-track'
          },
          {
            id: 'client-satisfaction',
            title: 'Client Satisfaction',
            value: '94.2%',
            change: 2.1,
            target: '95%',
            status: 'on-track'
          },
          {
            id: 'content-roi',
            title: 'Content ROI',
            value: '340%',
            change: 15.8,
            target: '300%',
            status: 'ahead'
          },
          {
            id: 'automation-savings',
            title: 'Automation Savings',
            value: '$28.5K',
            change: 22.3,
            target: '$25K',
            status: 'ahead'
          }
        ]);

        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch executive data:', error);
        setLoading(false);
      }
    };

    fetchExecutiveData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ahead': return 'bg-green-100 text-green-800';
      case 'on-track': return 'bg-blue-100 text-blue-800';
      case 'at-risk': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ahead': return <CheckCircle2 className="h-4 w-4" />;
      case 'on-track': return <Target className="h-4 w-4" />;
      case 'at-risk': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Executive Center</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Loading...</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Executive Center</h2>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Calendar className="mr-2 h-4 w-4" />
            Last 30 Days
          </Button>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
              {getStatusIcon(kpi.status)}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Target: {kpi.target}
                </p>
                <Badge className={getStatusColor(kpi.status)}>
                  +{kpi.change}%
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="roadmap">Roadmap</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Business Performance</CardTitle>
                <CardDescription>
                  Revenue growth and client acquisition metrics
                </CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Revenue Progress</span>
                        <span className="text-sm text-muted-foreground">
                          ${metrics?.revenue.current.toLocaleString()} / ${metrics?.revenue.target.toLocaleString()}
                        </span>
                      </div>
                      <Progress 
                        value={(metrics?.revenue.current || 0) / (metrics?.revenue.target || 1) * 100} 
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Client Retention</span>
                        <span className="text-sm text-muted-foreground">
                          {metrics?.clients.retention}%
                        </span>
                      </div>
                      <Progress 
                        value={metrics?.clients.retention || 0} 
                        className="mt-2"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Automation Impact</CardTitle>
                <CardDescription>
                  Cost savings and efficiency gains
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 text-green-600 mr-2" />
                    <div>
                      <p className="text-2xl font-bold text-green-600">
                        ${metrics?.automation.cost_savings.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">Monthly savings</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Zap className="h-4 w-4 text-blue-600 mr-2" />
                    <div>
                      <p className="text-2xl font-bold text-blue-600">
                        {metrics?.automation.efficiency}%
                      </p>
                      <p className="text-xs text-muted-foreground">Process efficiency</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <TrendingUp className="h-4 w-4 text-purple-600 mr-2" />
                    <div>
                      <p className="text-2xl font-bold text-purple-600">
                        {metrics?.automation.uptime}%
                      </p>
                      <p className="text-xs text-muted-foreground">System uptime</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="roadmap" className="space-y-4">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="mr-2 h-5 w-5" />
                  Production Roadmap 2026
                </CardTitle>
                <CardDescription>
                  Strategic initiatives and automation milestones
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Q1 2026 */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-lg">Q1 2026 - Foundation</h4>
                    <Badge className="bg-green-100 text-green-800">Completed</Badge>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="flex items-center space-x-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span>Complete automation pipeline deployment</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span>Integrate NotebookLM for content generation</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span>Implement 9-worker automation system</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span>Launch production monitoring dashboard</span>
                    </div>
                  </div>
                </div>

                {/* Q2 2026 */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-lg">Q2 2026 - Scale & Optimize</h4>
                    <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="flex items-center space-x-3">
                      <Clock className="h-5 w-5 text-blue-600" />
                      <span>Advanced AI-powered content optimization</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Clock className="h-5 w-5 text-blue-600" />
                      <span>Multi-language content automation</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Clock className="h-5 w-5 text-blue-600" />
                      <span>Enhanced video production pipeline</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Clock className="h-5 w-5 text-blue-600" />
                      <span>Client portal integration</span>
                    </div>
                  </div>
                </div>

                {/* Q3 2026 */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-lg">Q3 2026 - Intelligence</h4>
                    <Badge className="bg-gray-100 text-gray-800">Planned</Badge>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="flex items-center space-x-3">
                      <AlertCircle className="h-5 w-5 text-gray-500" />
                      <span>Predictive analytics for tax planning</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <AlertCircle className="h-5 w-5 text-gray-500" />
                      <span>Automated compliance monitoring</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <AlertCircle className="h-5 w-5 text-gray-500" />
                      <span>Smart document processing</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <AlertCircle className="h-5 w-5 text-gray-500" />
                      <span>Advanced lead scoring system</span>
                    </div>
                  </div>
                </div>

                {/* Q4 2026 */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-lg">Q4 2026 - Innovation</h4>
                    <Badge className="bg-gray-100 text-gray-800">Planned</Badge>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="flex items-center space-x-3">
                      <AlertCircle className="h-5 w-5 text-gray-500" />
                      <span>AI tax advisor chatbot</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <AlertCircle className="h-5 w-5 text-gray-500" />
                      <span>Blockchain integration for compliance</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <AlertCircle className="h-5 w-5 text-gray-500" />
                      <span>Mobile app for client management</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <AlertCircle className="h-5 w-5 text-gray-500" />
                      <span>Global expansion framework</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}