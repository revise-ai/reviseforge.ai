import React from 'react'
import Hero from "@/components/Hero"
import Footer from "@/components/Footer"
import FeaturesSection from '@/components/FeaturesSection'
import Demo from '@/components/Demo'
import Testimonials from '@/components/Testimonials'

const page = () => {
  return (
    <div>
      <Hero/>
      <Demo/>
      <FeaturesSection/>
      <Testimonials/>
      <Footer/>
    </div>
  )
}

export default page
