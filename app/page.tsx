import React from 'react'
import Hero from "@/components/Hero"
import Footer from "@/components/Footer"
import FeaturesSection from '@/components/FeaturesSection'
import Demo from '@/components/Demo'
import Testimonials from '@/components/Testimonials'
import CallToAction from '@/components/CallToAction'
import Integrations from '@/components/Integrations'

const page = () => {
  return (
    <div>
      <Hero/>
      <Demo/>
      <Integrations/>
      <FeaturesSection/>
      <Testimonials/>
      <CallToAction/>
      <Footer/>
    </div>
  )
}

export default page
