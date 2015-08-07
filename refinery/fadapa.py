"""
Python module to parse FastQC output data.
"""

from __future__ import print_function


class Fadapa(object):
    """
    Returns a parsed data object for given fastqc data file
    """

    def __init__(self, content, **kwargs):
        """
        :arg file_name: Name of fastqc_data text file.
        :type file_name: str.
        """
        self._content = content
        self._m_mark = '>>'
        self._m_end = '>>END_MODULE'

    def summary(self):
        """
        Returns a list of all modules present in the content.
        Module begins  with  _m_mark ends with _m_end.

        :return: List of modules and their status.

        Sample module:

        >>Basic Statistics	pass
        #Measure	Value
        Filename	sample1.fastq
        >>END_MODULE

        """
        modules = [line.split('\t') for line in self._content
                   if self._m_mark in line and self._m_end not in line]
        data = [[i[2:], j] for i, j in modules]
        data.insert(0, ['Module Name', 'Status'])
        return data

    def content(self):
        """
        Print the contents of the given file.

        :return: Content
        """
        return '\n'.join(self._content)

    def raw_data(self, module):
        """
        Returns raw data lines for a given module name.

        :arg module: Name of module as returned by summary function.
        :type module: str.
        :return: List of strings which consists of raw data of module.
        """
        s_pos = next(self._content.index(x) for x in self._content
                     if module in x)
        e_pos = self._content[s_pos:].index(self._m_end)
        raw_data = self._content[s_pos:s_pos+e_pos+1]
        return raw_data

    def clean_data(self, module):
        """
        Returns a cleaned data for the given module.

        :arg module: name of module
        :type module: str
        :return List of strings containing the clean data of module.
        """
        data = [list(filter(None, x.split('\t')))
                for x in self.raw_data(module)[1:-1]]
        data[0][0] = data[0][0][1:]
        return data
