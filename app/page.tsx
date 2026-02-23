import React from 'react'
import Hero from "@/components/Hero"
import Footer from "@/components/Footer"
import TrustedBrand from '@/components/TrustedBrand'
import FeaturesSection from '@/components/FeaturesSection'

const page = () => {
  return (
    <div>
      <Hero/>
      <TrustedBrand/>
      <FeaturesSection/>
      <Footer/>
    </div>
  )
}

export default page
