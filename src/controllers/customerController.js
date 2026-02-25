import Customer from "../models/Customer.js"
import { handleImageUpload } from "../services/image.service.js"

// @desc    Get all customers with pagination and filtering
// @route   GET /api/customers
// @access  Private
export const getCustomers = async (req, res) => {
  try {
    const pageSize = Number(req.query.limit) || 10
    const page = Number(req.query.page) || 1

    const query = { isDeleted: { $ne: true } }

    if (req.query.search) {
      const searchRegex = { $regex: req.query.search, $options: "i" }
      query.$or = [
        { customerName: searchRegex },
        { companyName: searchRegex },
        { email: searchRegex },
      ]
    }

    const count = await Customer.countDocuments(query)

    const customers = await Customer.find(query)
      .sort({ createdAt: -1 })
      .limit(pageSize)
      .skip(pageSize * (page - 1))

    res.json({
      customers,
      page,
      pages: Math.ceil(count / pageSize),
      total: count,
    })
  } catch (error) {
    res.status(500).json({ message: "Error fetching customers", error: error.message })
  }
}

// @desc    Get single customer
// @route   GET /api/customers/:id
// @access  Private
export const getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id)
    if (customer && !customer.isDeleted) {
      res.json(customer)
    } else {
      res.status(404).json({ message: "Customer not found" })
    }
  } catch (error) {
    res.status(500).json({ message: "Error fetching customer", error: error.message })
  }
}

// @desc    Create a new customer
// @route   POST /api/customers
// @access  Private
export const createCustomer = async (req, res) => {
  try {
    const { customerName, companyName, address, phoneNumber, email } = req.body

    const existingCustomer = await Customer.findOne({ email, isDeleted: { $ne: true } })
    if (existingCustomer) {
      return res.status(400).json({ message: "Customer with this email already exists" })
    }

    let logoId = ""
    if (req.file) {
      const savedImage = await handleImageUpload(req.file, req.user, {
        category: "customer_logo",
        name: `${customerName} Logo`,
      })
      logoId = savedImage._id.toString()
    }

    const customer = new Customer({
      customerName,
      companyName,
      address,
      phoneNumber,
      email,
      logo: logoId,
    })

    const createdCustomer = await customer.save()
    res.status(201).json(createdCustomer)
  } catch (error) {
    res.status(500).json({ message: "Error creating customer", error: error.message })
  }
}

// @desc    Update customer
// @route   PUT /api/customers/:id
// @access  Private
export const updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id)

    if (customer && !customer.isDeleted) {
      customer.customerName = req.body.customerName || customer.customerName
      customer.companyName = req.body.companyName || customer.companyName
      customer.address = req.body.address || customer.address
      customer.phoneNumber = req.body.phoneNumber || customer.phoneNumber
      customer.email = req.body.email || customer.email

      if (req.file) {
        const savedImage = await handleImageUpload(req.file, req.user, {
          category: "customer_logo",
          name: `${customer.customerName} Logo`,
        })
        customer.logo = savedImage._id.toString()
      }

      const updatedCustomer = await customer.save()
      res.json(updatedCustomer)
    } else {
      res.status(404).json({ message: "Customer not found" })
    }
  } catch (error) {
    res.status(500).json({ message: "Error updating customer", error: error.message })
  }
}

// @desc    Delete customer (soft delete)
// @route   DELETE /api/customers/:id
// @access  Private
export const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id)

    if (customer) {
      customer.isDeleted = true
      await customer.save()
      res.json({ message: "Customer removed" })
    } else {
      res.status(404).json({ message: "Customer not found" })
    }
  } catch (error) {
    res.status(500).json({ message: "Error deleting customer", error: error.message })
  }
}
