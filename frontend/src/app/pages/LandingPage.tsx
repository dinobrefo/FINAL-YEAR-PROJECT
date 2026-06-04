import * as React from "react";
import { useNavigate } from "react-router";
import { Button } from "../components/ierbms/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ierbms/Card";
import { Activity, Ambulance, Hospital, Map, Users, Stethoscope, CheckCircle } from "lucide-react";

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Activity,
      title: "Real-Time Coordination",
      description: "Instant communication between ambulances and hospitals for faster response times",
    },
    {
      icon: Map,
      title: "AI-Powered Recommendations",
      description: "Smart hospital selection based on patient condition, distance, and availability",
    },
    {
      icon: Hospital,
      title: "Resource Management",
      description: "Live tracking of bed availability, ICU capacity, and medical equipment",
    },
    {
      icon: Users,
      title: "Role-Based Access",
      description: "Customized dashboards for ambulance staff, doctors, nurses, and administrators",
    },
  ];

  const roles = [
    {
      name: "Ambulance Personnel",
      icon: Ambulance,
      description: "Create emergencies, track routes, and receive hospital recommendations",
      path: "/ambulance",
      color: "bg-[var(--primary)]",
    },
    {
      name: "Hospital Staff",
      icon: Hospital,
      description: "Manage beds, ICU capacity, equipment, and incoming ambulances",
      path: "/hospital",
      color: "bg-[var(--success)]",
    },
    {
      name: "Medical Doctors",
      icon: Stethoscope,
      description: "View assigned patients, incoming cases, and treatment queues",
      path: "/doctor",
      color: "bg-[var(--info)]",
    },
    {
      name: "Command Center",
      icon: Map,
      description: "Monitor city-wide emergencies, track ambulances, and allocate resources",
      path: "/command",
      color: "bg-[var(--warning)]",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[var(--primary)] to-[var(--info)] text-white">
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
              `,
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-24">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-8">
              <Activity className="h-4 w-4" />
              <span className="text-sm font-medium">AI-Powered Emergency Management</span>
            </div>

            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Integrated Emergency Resource
              <br />
              & Bed Management System
            </h1>

            <p className="text-xl text-white/90 mb-8 max-w-3xl mx-auto">
              Real-time coordination between ambulances and hospitals for faster emergency response,
              intelligent resource allocation, and improved patient outcomes.
            </p>

            <div className="flex items-center justify-center gap-4">
              <Button
                variant="secondary"
                size="lg"
                onClick={() => navigate("/ambulance")}
              >
                Launch Dashboard
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
              >
                Learn More
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
              <div className="text-center">
                <p className="text-4xl font-bold mb-2">8.5 min</p>
                <p className="text-white/80">Average Response Time</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-bold mb-2">94%</p>
                <p className="text-white/80">Match Accuracy</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-bold mb-2">2,400+</p>
                <p className="text-white/80">Lives Saved</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Key Features</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Advanced technology powering healthcare emergency coordination
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, idx) => (
              <Card key={idx} className="border-2 hover:border-[var(--primary)] transition-colors">
                <CardHeader>
                  <div className="h-12 w-12 bg-[var(--primary)] rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Role-Based Portals</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Access specialized dashboards designed for your specific role
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {roles.map((role, idx) => (
              <Card
                key={idx}
                className="border-2 hover:border-[var(--primary)] transition-all hover:shadow-lg cursor-pointer group"
                onClick={() => navigate(role.path)}
              >
                <CardHeader>
                  <div className={`h-16 w-16 ${role.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <role.icon className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle>{role.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-4">{role.description}</CardDescription>
                  <Button variant="outline" size="sm" className="w-full">
                    View Dashboard
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Streamlined emergency response workflow
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: "01", title: "Emergency Call", description: "Ambulance personnel create emergency case" },
              { step: "02", title: "AI Analysis", description: "System analyzes patient condition and resources" },
              { step: "03", title: "Hospital Match", description: "Best hospital recommended based on multiple factors" },
              { step: "04", title: "Coordination", description: "Real-time updates between ambulance and hospital" },
            ].map((item, idx) => (
              <div key={idx} className="text-center relative">
                {idx < 3 && (
                  <div className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-border z-0" />
                )}
                <div className="relative z-10 inline-flex items-center justify-center h-16 w-16 bg-[var(--primary)] rounded-full text-white text-xl font-bold mb-4">
                  {item.step}
                </div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-[var(--primary)] to-[var(--info)] text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Transform Emergency Response?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Join hospitals and ambulance services already using IERBMS to save lives
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => navigate("/ambulance")}
            >
              Get Started
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="bg-white/10 border-white/30 text-white hover:bg-white/20"
            >
              Contact Sales
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-[var(--primary)] mb-2">IERBMS</h3>
              <p className="text-sm text-muted-foreground">
                AI-Powered Integrated Emergency Resource and Bed Management System
              </p>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">About</a>
              <a href="#" className="hover:text-foreground transition-colors">Features</a>
              <a href="#" className="hover:text-foreground transition-colors">Contact</a>
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} IERBMS. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};
