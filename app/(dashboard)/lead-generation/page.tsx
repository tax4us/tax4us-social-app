"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Users, 
  Star, 
  MapPin, 
  Briefcase,
  Search,
  Filter,
  Download,
  Eye
} from "lucide-react"

export default function LeadGenerationPage() {
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadLeads()
  }, [])

  const loadLeads = async () => {
    try {
      const response = await fetch('/api/lead-generation')
      const data = await response.json()
      if (data.leads) {
        setLeads(data.leads)
      }
    } catch (error) {
      console.error('Failed to load leads:', error)
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-blue-600'
    if (score >= 50) return 'text-orange-600'
    return 'text-gray-600'
  }

  const getScoreBadge = (score: number) => {
    if (score >= 90) return 'High Value'
    if (score >= 70) return 'Medium Value'
    return 'Low Value'
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Lead Generation</h1>
          <p className="text-gray-600">AI-powered Israeli-American professional targeting</p>
        </div>
        <Badge variant="outline" className="text-blue-600 border-blue-600">
          LinkedIn + Apify Integration
        </Badge>
      </div>

      {/* Lead Generation Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-blue-600">247</div>
            <div className="text-sm text-gray-600">Total Profiles</div>
            <div className="text-xs text-blue-600 mt-1">Scraped this month</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-green-600">23</div>
            <div className="text-sm text-gray-600">High-Value Leads</div>
            <div className="text-xs text-green-600 mt-1">Score 80+</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-orange-600">68%</div>
            <div className="text-sm text-gray-600">Match Rate</div>
            <div className="text-xs text-orange-600 mt-1">Target criteria</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-purple-600">$2.1M</div>
            <div className="text-sm text-gray-600">Pipeline Value</div>
            <div className="text-xs text-purple-600 mt-1">Estimated potential</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-500" />
            Lead Discovery
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input 
              placeholder="Search by name, company, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
            <Button>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* High-Value Leads */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            High-Value Prospects
          </CardTitle>
          <CardDescription>Israeli-American professionals with highest conversion potential</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Lead 1 */}
            <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">SC</span>
                </div>
                <div className="flex-1">
                  <div className="font-semibold">Sarah Cohen</div>
                  <div className="text-sm text-gray-600 flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-3 h-3" />
                      Senior Tax Manager at Big4 Firm
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      New York, NY
                    </span>
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    Israeli-American CPA • Cross-Border Tax Specialist • 500+ connections
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-2xl font-bold ${getScoreColor(95)}`}>95</div>
                <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
                  High Value
                </Badge>
                <div className="mt-2 flex gap-2">
                  <Button size="sm">
                    <Eye className="w-3 h-3 mr-1" />
                    View
                  </Button>
                  <Button size="sm" variant="outline">
                    Connect
                  </Button>
                </div>
              </div>
            </div>

            {/* Lead 2 */}
            <div className="flex items-center justify-between p-4 border rounded-lg bg-blue-50">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">DR</span>
                </div>
                <div className="flex-1">
                  <div className="font-semibold">David Rosen</div>
                  <div className="text-sm text-gray-600 flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-3 h-3" />
                      CFO at Tech Startup
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      San Francisco, CA
                    </span>
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    Dual Citizen • Tech Finance • International Tax Compliance Experience
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-2xl font-bold ${getScoreColor(87)}`}>87</div>
                <Badge variant="outline" className="text-blue-600 border-blue-600 text-xs">
                  High Value
                </Badge>
                <div className="mt-2 flex gap-2">
                  <Button size="sm">
                    <Eye className="w-3 h-3 mr-1" />
                    View
                  </Button>
                  <Button size="sm" variant="outline">
                    Connect
                  </Button>
                </div>
              </div>
            </div>

            {/* Lead 3 */}
            <div className="flex items-center justify-between p-4 border rounded-lg bg-orange-50">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">ML</span>
                </div>
                <div className="flex-1">
                  <div className="font-semibold">Maya Levy</div>
                  <div className="text-sm text-gray-600 flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-3 h-3" />
                      International Business Consultant
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      Miami, FL
                    </span>
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    Israeli Entrepreneur • US-Israel Business Bridge • Tax Complexity Issues
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-2xl font-bold ${getScoreColor(73)}`}>73</div>
                <Badge variant="outline" className="text-orange-600 border-orange-600 text-xs">
                  Medium Value
                </Badge>
                <div className="mt-2 flex gap-2">
                  <Button size="sm">
                    <Eye className="w-3 h-3 mr-1" />
                    View
                  </Button>
                  <Button size="sm" variant="outline">
                    Connect
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conversion Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-500" />
            Lead Funnel Analytics
          </CardTitle>
          <CardDescription>Conversion pipeline and engagement metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-xl font-bold text-blue-600">247</div>
              <div className="text-sm text-gray-600">Prospects</div>
              <div className="text-xs text-blue-600 mt-1">Identified</div>
            </div>
            <div className="flex justify-center">
              <div className="w-8 h-0.5 bg-gray-300 mt-6"></div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-xl font-bold text-green-600">89</div>
              <div className="text-sm text-gray-600">Qualified</div>
              <div className="text-xs text-green-600 mt-1">36% rate</div>
            </div>
            <div className="flex justify-center">
              <div className="w-8 h-0.5 bg-gray-300 mt-6"></div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-xl font-bold text-purple-600">23</div>
              <div className="text-sm text-gray-600">High-Value</div>
              <div className="text-xs text-purple-600 mt-1">26% rate</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}