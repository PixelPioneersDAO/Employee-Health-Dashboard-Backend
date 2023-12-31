import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { createSendbirdUser } from '../handlers/sendbird';
dotenv.config();

class EmployeeDetails {
  prisma = new PrismaClient();

  /**
   * This function creates an employee in Employee database. This function also
   * create a emp id which is a primary key extracted from the id of the login
   * user. The username is also checked if its is same with the emp id.
   * @param req
   * @param res
   * @returns
   */
  createEmployeeDetails = async (req: Request, res: Response) => {
    const {
      empId,
      username,
      companyEmail,
      designation,
      salary,
      role,
      gender,
      age,
      dateOfJoining,
      name,
    } = req.body;

    if (!username || !companyEmail || !role) {
      return res.status(400).json({
        message: 'Username, company email, and role are required.',
      });
    }

    try {
      // Check if the employee with empId already exists
      const existingEmployee = await this.prisma.employee.findUnique({
        where: { empId },
      });

      if (existingEmployee) {
        return res.status(400).json({ message: 'Employee already exists.' });
      }

      // Check if the user with empId exists in the Register model
      const existingUser = await this.prisma.register.findUnique({
        where: { id: empId },
      });

      if (!existingUser) {
        return res
          .status(400)
          .json({ message: 'Employee not in the login database.' });
      }

      if (existingUser.username !== username) {
        return res.status(400).json({
          message: 'Employee username does not match with login username',
        });
      }
      const dateObject = new Date(dateOfJoining);
      // Create a new employee and save it to the database
      const newEmployee = await this.prisma.employee.create({
        data: {
          empId,
          username,
          name,
          companyEmail,
          designation,
          dateOfJoining:dateObject.toISOString(),
          salary,
          role,
          gender,
          age,
        },
      });

      await createSendbirdUser(empId, username);

      res.status(201).json({
        message: 'Employee Details registered successfully.',
        data: newEmployee,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  };

  /**
   * This function implements the get all employees in the Employee database
   * but a pagination is constructed with a limit of 20 employees.
   * @param req
   * @param res
   */
  getEmployeeDetails = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = 20;

    try {
      const skip = (page - 1) * limit;

      const employees = await this.prisma.employee.findMany({
        skip,
        take: limit,
      });

      const totalEmployeeCount = await this.prisma.employee.count();

      res.status(200).json({
        currentPage: page,
        totalPages: Math.ceil(totalEmployeeCount / limit),
        employeeCount: totalEmployeeCount,
        employees,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  };

  /**
   * This function fetch the list of single employee of the given emp Id
   * @param req
   * @param res
   * @returns
   */
  getSingleEmployee = async (req: Request, res: Response) => {
    const empId = parseInt(req.params.id);

    if (!empId) {
      return res.status(400).json({ message: 'Emp Id is missing or invalid.' });
    }

    try {
      const employee = await this.prisma.employee.findUnique({
        where: { empId },
      });

      if (!employee) {
        return res.status(404).json({ message: 'Employee not found.' });
      }

      res.status(200).json({ employee });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  };

  /**
   * This function updates the single employee data according to the given employee
   * request parameters to be updated
   * @param req
   * @param res
   * @returns
   */
  updateSingleEmployee = async (req: Request, res: Response) => {
    const empId = parseInt(req.params.id);

    if (!empId) {
      return res
        .status(400)
        .json({ message: 'Employee Id is missing or invalid.' });
    }

    try {
      // Find the employee by empId
      const employee = await this.prisma.employee.findUnique({
        where: { empId },
      });

      if (!employee) {
        return res.status(404).json({ message: 'Employee not found' });
      }

      // Update the employee's fields if provided in the request body
      if (req.body.companyEmail) {
        employee.companyEmail = req.body.companyEmail;
      }
      if (req.body.designation) {
        employee.designation = req.body.designation;
      }
      if (req.body.salary) {
        employee.salary = req.body.salary;
      }
      if (req.body.gender) {
        employee.gender = req.body.gender;
      }
      if (req.body.dateOfJoining) {
        employee.dateOfJoining = req.body.dateOfJoining;
      }

      // Save the updated employee
      const updatedEmployee = await this.prisma.employee.update({
        where: { empId },
        data: {
          companyEmail: employee.companyEmail,
          designation: employee.designation,
          salary: employee.salary,
          gender: employee.gender,
          dateOfJoining: employee.dateOfJoining,
        },
      });

      res
        .status(200)
        .json({ message: 'Employee updated successfully', updatedEmployee });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  };

  /**
   * This function deletes a single employee with the given emp Id
   * @param req
   * @param res
   * @returns
   */
  deleteSingleEmployee = async (req: Request, res: Response) => {
    const empId = parseInt(req.params.id);

    if (!empId) {
      return res
        .status(400)
        .json({ message: 'Employee Id is missing or invalid.' });
    }

    try {
      // Find the employee by empId
      const employee = await this.prisma.employee.findUnique({
        where: { empId },
      });

      if (!employee) {
        return res.status(404).json({ message: 'Employee not found.' });
      }

      // Delete the employee and their corresponding login record
      await this.prisma.employee.delete({
        where: { empId },
      });

      await this.prisma.register.delete({
        where: { id: empId },
      });

      res.status(200).json({
        message: 'Employee and associated login record deleted successfully',
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  };
}

export default EmployeeDetails;
