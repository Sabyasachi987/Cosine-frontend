"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { Shield, Plus, Users, LogOut, Trash2, BookOpen, CheckCircle, Copy, Mail, Key, AlertTriangle } from "lucide-react"

interface Teacher {
  id: string
  name: string
  email: string
  subjects: string[]
  dateAdded: string
}

export default function AdminDashboard() {
  const [user, setUser] = useState<any>(null)
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showCredentialsDialog, setShowCredentialsDialog] = useState(false)
  const [teacherCredentials, setTeacherCredentials] = useState<{
    name: string
    email: string
    password: string
  } | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null)
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  
  const [newTeacher, setNewTeacher] = useState({
    name: "",
    email: "",
    subjects: "",
    password: "",
  })
  
  const [showAddForm, setShowAddForm] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  // Copy to clipboard function
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied!",
      description: "Text copied to clipboard",
      duration: 2000,
    })
  }

  useEffect(() => {
    const adminData = localStorage.getItem("adminUser")
    const adminToken = localStorage.getItem("adminAccessToken")
    
    if (adminData && adminToken) {
      const parsedUser = JSON.parse(adminData)
      if (parsedUser.role !== "admin") {
        toast({
          title: "Access Denied",
          description: "Admin access required.",
          variant: "destructive",
          duration: 4000,
        })
        router.push("/auth/admin-login")
        return
      }
      setUser(parsedUser)
      fetchTeachers()
    } else {
      router.push("/auth/admin-login")
    }
  }, [router])

  // Fetch teachers from backend
  const fetchTeachers = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("adminAccessToken")
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const response = await fetch(`${apiUrl}/api/admin/teachers`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          const formattedTeachers = data.data.map((teacher: any) => ({
            id: teacher.id.toString(),
            name: `${teacher.firstName} ${teacher.lastName}`,
            email: teacher.email,
            subjects: teacher.teacherProfile?.subjectsTaught || [],
            dateAdded: new Date(teacher.createdAt).toISOString().split("T")[0]
          }))
          setTeachers(formattedTeachers)
        }
      }
    } catch (error) {
      console.error('Error fetching teachers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    setShowLogoutDialog(true)
  }

  const confirmLogout = () => {
    localStorage.removeItem("adminUser")
    localStorage.removeItem("adminAccessToken")
    localStorage.removeItem("adminRefreshToken")
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
      duration: 2000,
    })
    router.push("/")
  }

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (newTeacher.name && newTeacher.email && newTeacher.password && newTeacher.subjects) {
      setSubmitting(true)
      
      try {
        const token = localStorage.getItem("adminAccessToken")
        const [firstName, ...lastNameParts] = newTeacher.name.trim().split(' ')
        const lastName = lastNameParts.join(' ') || 'Teacher'
        
        const teacherData = {
          firstName,
          lastName,
          email: newTeacher.email,
          password: newTeacher.password,
          subjects: newTeacher.subjects.split(",").map(s => s.trim())
        }
        
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
        const response = await fetch(`${apiUrl}/api/admin/teachers`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(teacherData)
        })
        
        const data = await response.json()
        
        if (data.success) {
          // Set credentials for the dialog
          setTeacherCredentials({
            name: newTeacher.name,
            email: newTeacher.email,
            password: newTeacher.password
          })
          setShowCredentialsDialog(true)
          
          setNewTeacher({ name: "", email: "", subjects: "", password: "" })
          setShowAddForm(false)
          
          // Refresh the teachers list
          fetchTeachers()
        } else {
          toast({
            title: "Error",
            description: `Error adding teacher: ${data.message}`,
            variant: "destructive",
            duration: 4000,
          })
        }
      } catch (error) {
        console.error('Error adding teacher:', error)
        toast({
          title: "Error",
          description: "Error adding teacher. Please try again.",
          variant: "destructive",
          duration: 4000,
        })
      } finally {
        setSubmitting(false)
      }
    }
  }

  const handleDeleteTeacher = async (id: string) => {
    const teacher = teachers.find(t => t.id === id)
    if (teacher) {
      setTeacherToDelete(teacher)
      setShowDeleteDialog(true)
    }
  }

  const confirmDeleteTeacher = async () => {
    if (!teacherToDelete) return
    
    try {
      const token = localStorage.getItem("adminAccessToken")
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const response = await fetch(`${apiUrl}/api/admin/teachers/${teacherToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "Teacher Removed",
          description: `${teacherToDelete?.name} has been successfully removed and their access has been revoked.`,
          duration: 4000,
        })
        // Refresh the teachers list
        fetchTeachers()
      } else {
        toast({
          title: "Error",
          description: `Error removing teacher: ${data.message}`,
          variant: "destructive",
          duration: 4000,
        })
      }
    } catch (error) {
      console.error('Error deleting teacher:', error)
      toast({
        title: "Error",
        description: "Error removing teacher. Please try again.",
        variant: "destructive",
        duration: 4000,
      })
    } finally {
      setShowDeleteDialog(false)
      setTeacherToDelete(null)
    }
  }

  if (!user || loading) return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading dashboard...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Mobile-Optimized Header */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-50">
        <div className="px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-red-600" />
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">
                Admin Dashboard
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <span className="hidden sm:block text-sm text-gray-600">
                Welcome, {user.name}
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                className="flex items-center gap-1 sm:gap-2"
              >
                <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
          {/* Mobile Welcome Message */}
          <div className="sm:hidden mt-2">
            <span className="text-xs text-gray-600">Welcome, {user.name}</span>
          </div>
        </div>
      </header>

      <div className="px-4 sm:px-6 py-4 sm:py-8 space-y-6">
        {/* Mobile-Optimized Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <Card className="bg-white/80 backdrop-blur-sm border-gray-200/50 hover:shadow-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Total Teachers</CardTitle>
              <div className="p-2 bg-blue-50 rounded-full">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-gray-900">{teachers.length}</div>
              <p className="text-xs text-gray-500 mt-1">Active educators</p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-gray-200/50 hover:shadow-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Active Subjects</CardTitle>
              <div className="p-2 bg-green-50 rounded-full">
                <BookOpen className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                {new Set(teachers.flatMap(t => t.subjects)).size}
              </div>
              <p className="text-xs text-gray-500 mt-1">Subjects offered</p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-gray-200/50 hover:shadow-lg transition-all duration-300 sm:col-span-2 lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">This Month</CardTitle>
              <div className="p-2 bg-purple-50 rounded-full">
                <Plus className="h-4 w-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                {teachers.filter(t => t.dateAdded.startsWith("2024-01")).length}
              </div>
              <p className="text-xs text-gray-500 mt-1">New additions</p>
            </CardContent>
          </Card>
        </div>

        {/* Mobile-Optimized Add Teacher Section */}
        <div className="space-y-4">
          <Button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Teacher
          </Button>
        </div>

        {/* Mobile-Optimized Add Teacher Form */}
        {showAddForm && (
          <Card className="bg-white/90 backdrop-blur-sm border-gray-200/50 shadow-xl">
            <CardHeader className="border-b border-gray-100">
              <CardTitle className="text-lg sm:text-xl text-gray-900">Add New Teacher</CardTitle>
              <CardDescription className="text-gray-600">Create a new teacher account with login credentials</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleAddTeacher} className="space-y-4 sm:space-y-6">
                {/* Mobile-First Form Layout */}
                <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="teacherName" className="text-sm font-medium text-gray-700">Full Name</Label>
                    <Input
                      id="teacherName"
                      placeholder="Enter teacher's full name"
                      value={newTeacher.name}
                      onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })}
                      required
                      className="h-11 rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="teacherEmail" className="text-sm font-medium text-gray-700">Email Address</Label>
                    <Input
                      id="teacherEmail"
                      type="email"
                      placeholder="Enter teacher's email"
                      value={newTeacher.email}
                      onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })}
                      required
                      className="h-11 rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="teacherSubjects" className="text-sm font-medium text-gray-700">Subjects</Label>
                    <Input
                      id="teacherSubjects"
                      placeholder="e.g., Mathematics, Physics, Chemistry"
                      value={newTeacher.subjects}
                      onChange={(e) => setNewTeacher({ ...newTeacher, subjects: e.target.value })}
                      required
                      className="h-11 rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500">Separate multiple subjects with commas</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="teacherPassword" className="text-sm font-medium text-gray-700">Temporary Password</Label>
                    <Input
                      id="teacherPassword"
                      type="password"
                      placeholder="Set temporary password"
                      value={newTeacher.password}
                      onChange={(e) => setNewTeacher({ ...newTeacher, password: e.target.value })}
                      required
                      className="h-11 rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500">Teacher can change this after first login</p>
                  </div>
                </div>
                {/* Mobile-Optimized Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button 
                    type="submit"
                    disabled={submitting}
                    className="flex-1 sm:flex-none bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-medium py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {submitting ? 'Adding Teacher...' : 'Add Teacher'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowAddForm(false)}
                    className="flex-1 sm:flex-none border-gray-300 text-gray-700 hover:bg-gray-50 py-3 px-6 rounded-lg transition-all duration-300"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Mobile-Optimized Teachers List */}
        <Card className="bg-white/90 backdrop-blur-sm border-gray-200/50 shadow-xl">
          <CardHeader className="border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg sm:text-xl text-gray-900">Registered Teachers</CardTitle>
                <CardDescription className="text-gray-600">Manage teacher accounts and permissions</CardDescription>
              </div>
              <div className="bg-blue-50 text-blue-700 text-sm font-medium px-3 py-1 rounded-full">
                {teachers.length} Total
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-3 sm:space-y-4">
              {teachers.map((teacher) => (
                <div key={teacher.id} className="bg-gradient-to-r from-white to-gray-50 border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all duration-300">
                  {/* Mobile-Optimized Teacher Card Layout */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-3 sm:space-y-0">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between sm:justify-start sm:items-center">
                        <h3 className="font-semibold text-gray-900 text-base sm:text-lg">{teacher.name}</h3>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteTeacher(teacher.id)}
                          className="sm:hidden text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 h-8 w-8 p-0 rounded-lg"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-sm text-gray-600 flex items-center">
                          <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                          {teacher.email}
                        </p>
                        
                        <div className="flex flex-wrap gap-1">
                          {teacher.subjects.map((subject, index) => (
                            <span 
                              key={index}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
                            >
                              {subject.trim()}
                            </span>
                          ))}
                        </div>
                        
                        <p className="text-xs text-gray-400 flex items-center">
                          <span className="inline-block w-1 h-1 bg-gray-400 rounded-full mr-2"></span>
                          Added: {new Date(teacher.dateAdded).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    {/* Desktop Delete Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteTeacher(teacher.id)}
                      className="hidden sm:flex text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 transition-all duration-300"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
              
              {/* Empty State */}
              {teachers.length === 0 && (
                <div className="text-center py-12">
                  <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Users className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No teachers registered yet</h3>
                  <p className="text-gray-500 mb-6">Get started by adding your first teacher to the platform.</p>
                  <Button 
                    onClick={() => setShowAddForm(true)}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Teacher
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Teacher Credentials Success Dialog */}
      <Dialog open={showCredentialsDialog} onOpenChange={setShowCredentialsDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-green-100 rounded-full">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <DialogTitle className="text-center text-xl font-semibold text-gray-900">
              Teacher Added Successfully!
            </DialogTitle>
            <DialogDescription className="text-center text-gray-600">
              {teacherCredentials?.name} has been registered. Share these login credentials securely.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Email Credential */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-600" />
                Email Address
              </Label>
              <div className="flex items-center space-x-2">
                <Input
                  type="text"
                  value={teacherCredentials?.email || ""}
                  readOnly
                  className="bg-gray-50 border-gray-200 text-gray-900"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(teacherCredentials?.email || "")}
                  className="shrink-0 hover:bg-blue-50 hover:border-blue-200"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Password Credential */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Key className="w-4 h-4 text-purple-600" />
                Temporary Password
              </Label>
              <div className="flex items-center space-x-2">
                <Input
                  type="text"
                  value={teacherCredentials?.password || ""}
                  readOnly
                  className="bg-gray-50 border-gray-200 text-gray-900 font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(teacherCredentials?.password || "")}
                  className="shrink-0 hover:bg-purple-50 hover:border-purple-200"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Security Notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
              <p className="text-sm text-amber-800">
                <strong>Security Notice:</strong> Please share these credentials through a secure channel. 
                The teacher should change their password upon first login.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setShowCredentialsDialog(false)}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            >
              Got it, thanks!
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Teacher Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <DialogTitle className="text-center text-xl font-semibold text-gray-900">
              Remove Teacher
            </DialogTitle>
            <DialogDescription className="text-center text-gray-600">
              Are you sure you want to remove <span className="font-medium text-gray-900">{teacherToDelete?.name}</span>?
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
              <h4 className="text-sm font-medium text-red-800">This action will:</h4>
              <ul className="text-sm text-red-700 space-y-1">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-red-600 rounded-full"></div>
                  Remove them from the teacher list
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-red-600 rounded-full"></div>
                  Revoke their login access
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-red-600 rounded-full"></div>
                  Cannot be undone
                </li>
              </ul>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDeleteTeacher}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              Remove Teacher
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Logout Confirmation Dialog */}
      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-orange-100 rounded-full">
              <LogOut className="w-6 h-6 text-orange-600" />
            </div>
            <DialogTitle className="text-center text-xl font-semibold text-gray-900">
              Confirm Logout
            </DialogTitle>
            <DialogDescription className="text-center text-gray-600">
              Are you sure you want to log out of your admin account?
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-2">
              <p className="text-sm text-orange-800">
                You will need to log in again to access the admin dashboard.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowLogoutDialog(false)}
              className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmLogout}
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
            >
              Yes, Logout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Toaster />
    </div>
  )
}
