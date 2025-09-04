"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Star, Heart, Eye, Clock, ChevronLeft, ChevronRight, TrendingUp, Zap, Award, Users } from "lucide-react"

interface ServiceRecommendation {
  id: string
  title: string
  seller: {
    name: string
    avatar?: string
    level: number
    rating: number
    isTopRated: boolean
  }
  price: number
  originalPrice?: number
  rating: number
  reviewCount: number
  image: string
  deliveryTime: string
  tags: string[]
  isChoice?: boolean
  isTrending?: boolean
  viewCount: number
  orderCount: number
}

interface EnhancedServiceRecommendationsProps {
  currentServiceId: string
  category?: string
}

export function EnhancedServiceRecommendations({ currentServiceId, category }: EnhancedServiceRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<ServiceRecommendation[]>([])
  const [browsingHistory, setBrowsingHistory] = useState<ServiceRecommendation[]>([])
  const [trendingServices, setTrendingServices] = useState<ServiceRecommendation[]>([])
  const [currentSlide, setCurrentSlide] = useState(0)

  useEffect(() => {
    const mockRecommendations: ServiceRecommendation[] = [
      {
        id: "rec1",
        title: "I will create stunning WordPress website design with premium features",
        seller: { name: "Muhammad I", avatar: "", level: 2, rating: 5.0, isTopRated: true },
        price: 80,
        originalPrice: 120,
        rating: 5.0,
        reviewCount: 235,
        image: "/wordpress-website-design.png",
        deliveryTime: "3 days",
        tags: ["WordPress", "Responsive", "Premium"],
        isChoice: true,
        viewCount: 1250,
        orderCount: 89,
      },
      {
        id: "rec2",
        title: "I will design modern Shopify store with conversion optimization",
        seller: { name: "Sarah K", avatar: "", level: 3, rating: 4.9, isTopRated: true },
        price: 150,
        rating: 4.9,
        reviewCount: 412,
        image: "/shopify-store-design-modern.png",
        deliveryTime: "5 days",
        tags: ["Shopify", "E-commerce", "Conversion"],
        isTrending: true,
        viewCount: 2100,
        orderCount: 156,
      },
      {
        id: "rec3",
        title: "I will create professional logo design with unlimited revisions",
        seller: { name: "Alex M", avatar: "", level: 2, rating: 4.8, isTopRated: false },
        price: 45,
        originalPrice: 65,
        rating: 4.8,
        reviewCount: 189,
        image: "/professional-logo.png",
        deliveryTime: "2 days",
        tags: ["Logo", "Branding", "Professional"],
        viewCount: 890,
        orderCount: 67,
      },
      {
        id: "rec4",
        title: "I will develop custom React web application with modern UI",
        seller: { name: "David L", avatar: "", level: 3, rating: 4.9, isTopRated: true },
        price: 300,
        rating: 4.9,
        reviewCount: 98,
        image: "/react-web-application-modern.png",
        deliveryTime: "7 days",
        tags: ["React", "Custom", "Modern UI"],
        isTrending: true,
        viewCount: 1560,
        orderCount: 43,
      },
      {
        id: "rec5",
        title: "I will create engaging social media content and strategy",
        seller: { name: "Emma R", avatar: "", level: 2, rating: 4.7, isTopRated: false },
        price: 95,
        rating: 4.7,
        reviewCount: 267,
        image: "/social-media-content-strategy.png",
        deliveryTime: "4 days",
        tags: ["Social Media", "Content", "Strategy"],
        viewCount: 1340,
        orderCount: 78,
      },
    ]

    setRecommendations(mockRecommendations)
    setBrowsingHistory(mockRecommendations.slice(0, 4))
    setTrendingServices(mockRecommendations.filter((s) => s.isTrending))
  }, [currentServiceId, category])

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % Math.ceil(recommendations.length / 4))
  }

  const prevSlide = () => {
    setCurrentSlide(
      (prev) => (prev - 1 + Math.ceil(recommendations.length / 4)) % Math.ceil(recommendations.length / 4),
    )
  }

  const ServiceCard = ({ service }: { service: ServiceRecommendation }) => (
    <Card className="premium-card service-card-hover group cursor-pointer overflow-hidden">
      <div className="relative">
        <img
          src={service.image || "/placeholder.svg"}
          alt={service.title}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-3 left-3 flex gap-2">
          {service.isChoice && (
            <Badge className="bg-primary text-primary-foreground font-semibold">
              <Award className="w-3 h-3 mr-1" />
              Choice
            </Badge>
          )}
          {service.isTrending && (
            <Badge className="bg-secondary text-secondary-foreground font-semibold">
              <TrendingUp className="w-3 h-3 mr-1" />
              Trending
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-3 right-3 bg-white/80 hover:bg-white text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Heart className="w-4 h-4" />
        </Button>
        {service.originalPrice && (
          <div className="absolute bottom-3 left-3">
            <Badge variant="destructive" className="font-semibold">
              {Math.round(((service.originalPrice - service.price) / service.originalPrice) * 100)}% OFF
            </Badge>
          </div>
        )}
      </div>

      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <Avatar className="w-6 h-6">
              <AvatarFallback className="text-xs">{service.seller.name[0]}</AvatarFallback>
            </Avatar>
            <div className="flex items-center space-x-1">
              <span className="text-sm font-medium text-gray-700">{service.seller.name}</span>
              {service.seller.isTopRated && (
                <Badge variant="secondary" className="text-xs px-1 py-0">
                  Level {service.seller.level}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <h3 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-primary transition-colors">
          {service.title}
        </h3>

        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <div className="flex items-center">
            <Star className="w-4 h-4 text-yellow-400 fill-current mr-1" />
            <span className="font-medium">{service.rating}</span>
            <span className="ml-1">({service.reviewCount})</span>
          </div>
          <div className="flex items-center">
            <Eye className="w-4 h-4 mr-1" />
            <span>{service.viewCount}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          {service.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">{service.deliveryTime}</span>
          </div>
          <div className="text-right">
            {service.originalPrice && (
              <span className="text-sm text-gray-400 line-through mr-2">${service.originalPrice}</span>
            )}
            <span className="text-lg font-bold text-gray-900">From ${service.price}</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
          <span className="flex items-center">
            <Users className="w-3 h-3 mr-1" />
            {service.orderCount} orders
          </span>
          <span className="flex items-center">
            <Zap className="w-3 h-3 mr-1" />
            Offers video consultations
          </span>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-12 mt-12">
      {/* People Who Viewed This Service Also Viewed */}
      <section className="fade-in-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">People Who Viewed This Service Also Viewed</h2>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={prevSlide}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={nextSlide}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="smart-grid-lg">
          {recommendations.slice(currentSlide * 4, (currentSlide + 1) * 4).map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      </section>

      {/* Trending in Category */}
      {trendingServices.length > 0 && (
        <section className="gradient-section-premium p-8 rounded-2xl fade-in-up">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-secondary rounded-lg">
                <TrendingUp className="w-6 h-6 text-secondary-foreground" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Trending in {category || "This Category"}</h2>
                <p className="text-gray-600">Hot services everyone's talking about</p>
              </div>
            </div>
            <Button variant="outline" className="bg-white/80">
              View All Trending
            </Button>
          </div>

          <div className="smart-grid">
            {trendingServices.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        </section>
      )}

      {/* Your Browsing History */}
      <section className="fade-in-up">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Clock className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Your Browsing History</h2>
              <p className="text-gray-600">Services you've recently viewed</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" className="text-gray-500">
              Clear All
            </Button>
            <Button variant="outline" size="sm">
              See All
            </Button>
          </div>
        </div>

        <div className="smart-grid">
          {browsingHistory.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      </section>

      {/* Recommended for You */}
      <section className="gradient-section p-8 rounded-2xl fade-in-up">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary rounded-lg pulse-glow">
              <Zap className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Recommended for You</h2>
              <p className="text-gray-600">Personalized picks based on your interests</p>
            </div>
          </div>
          <Button className="bg-primary hover:bg-primary/90">Explore More</Button>
        </div>

        <div className="smart-grid-lg">
          {recommendations.slice(0, 6).map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      </section>
    </div>
  )
}
